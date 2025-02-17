/**
 * Forklift API
 * Migration toolkit for virtualization (Forklift) API definitions.
 *
 * The version of the OpenAPI document: 2.4.0
 * Contact Email: kubev2v-dev@redhat.com
 * License: Apache-2.0
 *
 * NOTE: This file is auto generated by crdtotypes (https://github.com/yaacov/crdtoapi/).
 * https://github.com/yaacov/crdtoapi/README.crdtotypes
 */

import { V1beta1StorageMapSpecMap } from './V1beta1StorageMapSpecMap';
import { V1beta1StorageMapSpecProvider } from './V1beta1StorageMapSpecProvider';

/**
 * Storage map spec.
 *
 * @export
 */
export interface V1beta1StorageMapSpec {
  /** map
   * Mapped storage.
   *
   * @required {true}
   */
  map: V1beta1StorageMapSpecMap[];
  /** provider
   * Provider
   *
   * @required {false}
   */
  provider?: V1beta1StorageMapSpecProvider;
}
