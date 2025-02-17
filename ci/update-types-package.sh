#!/usr/bin/env bash

set -euo pipefail
script_dir=$(dirname "$0")
types_package_dir=$(realpath $script_dir/../packages/types/src)

# Collect OpenAPI definitions from forklift CRDs
npx crdtoapi \
  -i ${script_dir}/yaml/crds/forklift \
  -m "forklift.konveyor.io" \
  -o ${script_dir}/yaml/openapi.yaml \
  --title "Forklift API" \
  --description "Migration toolkit for virtualization (Forklift) API definitions." \
  --license "Apache-2.0" \
  --apiVersion "2.4.0" \
  --contactEmail "kubev2v-dev@redhat.com"

npx crdtomodel \
  -i ${script_dir}/yaml/crds/forklift \
  -m "forklift.konveyor.io" \
  -o ${types_package_dir}/constants

npx crdtotypes \
  -o ${types_package_dir}/models \
  -i ${script_dir}/yaml/openapi.yaml
