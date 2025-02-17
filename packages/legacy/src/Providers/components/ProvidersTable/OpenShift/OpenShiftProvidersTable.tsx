import * as React from 'react';
import { Pagination, Level, LevelItem, Button } from '@patternfly/react-core';
import {
  Table,
  TableHeader,
  TableBody,
  sortable,
  compoundExpand,
  classNames as classNamesTransform,
  cellWidth,
  ICell,
  IRow,
  truncate,
} from '@patternfly/react-table';
import DatabaseIcon from '@patternfly/react-icons/dist/esm/icons/database-icon';
import NetworkIcon from '@patternfly/react-icons/dist/esm/icons/network-icon';
import tableStyles from '@patternfly/react-styles/css/components/Table/table';
import { useSortState, usePaginationState } from 'legacy/src/common/hooks';
import { useOCPMigrationNetworkMutation, useStorageClassesQuery } from 'legacy/src/queries';
import { ICorrelatedProvider, IOpenShiftProvider } from 'legacy/src/queries/types/providers.types';
import { ProviderActionsDropdown } from '../ProviderActionsDropdown';
import { StatusCondition } from 'legacy/src/common/components/StatusCondition';
import { MappingType } from 'legacy/src/queries/types';
import { getMostSeriousCondition, hasCondition, numStr } from 'legacy/src/common/helpers';
import { centerCellTransform } from 'legacy/src/utils/utils';

import './OpenShiftProvidersTable.css';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { PROVIDER_TYPE_NAMES } from 'legacy/src/common/constants';
import { isSameResource } from 'legacy/src/queries/helpers';
import { OpenShiftNetworkList } from './OpenShiftNetworkList';
import { SelectOpenShiftNetworkModal } from 'legacy/src/common/components/SelectOpenShiftNetworkModal';
import { OpenShiftStorageClassList } from './OpenShiftStorageClassList';

interface IOpenShiftProvidersTableProps {
  providers: ICorrelatedProvider<IOpenShiftProvider>[];
}

interface IExpandedItem {
  provider: ICorrelatedProvider<IOpenShiftProvider>;
  column: 'Networks' | 'Storage classes';
}

/**
 * @deprecated
 */
export const OpenShiftProvidersTable: React.FunctionComponent<IOpenShiftProvidersTableProps> = ({
  providers,
}: IOpenShiftProvidersTableProps) => {
  const storageClassesQuery = useStorageClassesQuery(
    providers.map((provider) => provider.inventory),
    MappingType.Storage
  );
  const getStorageClasses = (provider: ICorrelatedProvider<IOpenShiftProvider>) =>
    (storageClassesQuery.data && storageClassesQuery.data[provider.metadata.name]) || [];

  const resourceFields: ICell[] = [
    {
      title: 'Name',
      transforms: [sortable],
      cellTransforms: [truncate],
    },
    {
      title: 'Endpoint',
      transforms: [sortable],
      cellTransforms: [truncate],
    },
    {
      title: 'VMs',
      transforms: [sortable, cellWidth(10)],
      cellTransforms: [truncate],
    },
    {
      title: 'Networks',
      transforms: [sortable],
      cellTransforms: [compoundExpand, truncate, centerCellTransform],
    },
    {
      title: 'Storage classes',
      transforms: [sortable],
      cellTransforms: [compoundExpand, truncate, centerCellTransform],
    },
    {
      title: 'Status',
      transforms: [sortable],
      cellTransforms: [truncate],
    },
    {
      title: '',
      columnTransforms: [classNamesTransform(tableStyles.tableAction)],
      props: {
        className: spacing.prXs,
      },
    },
  ];

  const getSortValues = (provider: ICorrelatedProvider<IOpenShiftProvider>) => {
    const { vmCount, networkCount } = provider.inventory || {};
    const storageClasses = getStorageClasses(provider);
    return [
      '', // Radio button column
      provider.metadata.name,
      provider.spec.url || '',
      numStr(vmCount),
      numStr(networkCount),
      numStr(storageClasses.length),
      provider.status ? getMostSeriousCondition(provider.status?.conditions) : '',
      '',
    ];
  };

  const { sortBy, onSort, sortedItems } = useSortState(providers, getSortValues);
  const { currentPageItems, setPageNumber, paginationProps } = usePaginationState(sortedItems, 10);
  React.useEffect(() => setPageNumber(1), [sortBy, setPageNumber]);

  const [expandedItem, setExpandedItem] = React.useState<IExpandedItem | null>(null);

  const [selectedProvider, setSelectedProvider] =
    React.useState<ICorrelatedProvider<IOpenShiftProvider> | null>(null);

  const rows: IRow[] = [];
  currentPageItems.forEach((provider: ICorrelatedProvider<IOpenShiftProvider>) => {
    const { vmCount, networkCount } = provider.inventory || {};
    const isExpanded = isSameResource(expandedItem?.provider.metadata, provider.metadata);
    const storageClasses = getStorageClasses(provider);
    rows.push({
      meta: { provider },
      isOpen: isExpanded,
      selected: isSameResource(selectedProvider?.metadata, provider.metadata),
      disableSelection: !hasCondition(provider.status?.conditions || [], 'Ready'),
      cells: [
        provider.metadata.name,
        provider.spec.url,
        numStr(vmCount),
        {
          title: (
            <>
              <NetworkIcon key="networks-icon" /> {numStr(networkCount)}
            </>
          ),
          props: {
            isOpen: isExpanded && expandedItem?.column === 'Networks',
          },
        },
        {
          title: (
            <>
              <DatabaseIcon key="storage-classes-icon" /> {storageClasses.length}
            </>
          ),
          props: {
            isOpen: isExpanded && expandedItem?.column === 'Storage classes',
          },
        },
        {
          title: <StatusCondition status={provider.status} />,
        },
        {
          title: <ProviderActionsDropdown provider={provider} providerType="openshift" />,
        },
      ],
    });
    if (isExpanded) {
      rows.push({
        parent: rows.length - 1,
        compoundExpand:
          resourceFields.findIndex((column) => column.title === expandedItem?.column) + 1,
        fullWidth: true,
        cells: [
          {
            title:
              expandedItem?.column === 'Networks' ? (
                <OpenShiftNetworkList provider={provider} />
              ) : (
                <OpenShiftStorageClassList provider={provider} storageClasses={storageClasses} />
              ),
            props: {
              colSpan: resourceFields.length + 1,
              className: tableStyles.modifiers.noPadding,
            },
          },
        ],
      });
    }
  });

  const [isSelectNetworkModalOpen, toggleSelectNetworkModal] = React.useReducer(
    (isOpen) => !isOpen,
    false
  );

  const migrationNetworkMutation = useOCPMigrationNetworkMutation(
    selectedProvider.metadata.namespace,
    () => {
      toggleSelectNetworkModal();
      setExpandedItem({
        provider: selectedProvider as ICorrelatedProvider<IOpenShiftProvider>,
        column: 'Networks',
      });
      setSelectedProvider(null);
    }
  );

  const selectedNetworkName =
    (selectedProvider?.metadata.annotations &&
      selectedProvider?.metadata.annotations['forklift.konveyor.io/defaultTransferNetwork']) ||
    null;

  return (
    <>
      <Level className={spacing.pbSm}>
        <LevelItem>
          <Button
            variant="secondary"
            onClick={toggleSelectNetworkModal}
            isDisabled={!selectedProvider}
          >
            Select migration network
          </Button>
        </LevelItem>
        <LevelItem>
          <Pagination {...paginationProps} widgetId="providers-table-pagination-top" />
        </LevelItem>
      </Level>
      <Table
        variant="compact"
        aria-label={`${PROVIDER_TYPE_NAMES.openshift} providers table`}
        cells={resourceFields}
        rows={rows}
        sortBy={sortBy}
        onSort={onSort}
        onExpand={(_event, _rowIndex, colIndex, isOpen, resourceData) => {
          setExpandedItem(
            !isOpen
              ? {
                  provider: resourceData.meta.provider,
                  column: resourceFields[colIndex - 1].title as IExpandedItem['column'],
                }
              : null
          );
        }}
        onSelect={(_event, _isSelected, _rowIndex, resourceData) => {
          setSelectedProvider(resourceData.meta.provider);
        }}
        selectVariant="radio"
      >
        <TableHeader />
        <TableBody />
      </Table>
      <Pagination
        {...paginationProps}
        widgetId="providers-table-pagination-bottom"
        variant="bottom"
      />
      {isSelectNetworkModalOpen ? (
        <SelectOpenShiftNetworkModal
          key={selectedNetworkName}
          targetProvider={selectedProvider?.inventory || null}
          targetNamespace={null}
          initialSelectedNetwork={selectedNetworkName}
          instructions="Select a default migration network for the provider. This network will be used for migrating data to all namespaces to which it is attached."
          onClose={() => {
            toggleSelectNetworkModal();
            migrationNetworkMutation.reset();
            setSelectedProvider(null);
          }}
          onSubmit={(network) =>
            migrationNetworkMutation.mutate({
              provider: selectedProvider?.inventory || null,
              network,
            })
          }
          mutationResult={migrationNetworkMutation}
        />
      ) : null}
    </>
  );
};
