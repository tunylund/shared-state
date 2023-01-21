#!/bin/sh
set -e

./../node_modules/.bin/grpc_tools_node_protoc \
  --plugin=protoc-gen-ts_proto=./../node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src \
  --ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false,esModuleInterop=true \
  --proto_path=./proto \
  ./proto/*.proto

./../node_modules/.bin/tsc -p tsconfig.notests.json

for f in `find dist -name '*.js'`; do
  sed -i.bak -e "s/from ['\"]\.\(.*\)['\"]/from '\.\1.js'/g" $f
done
sed -i.bak -e "s/from \"protobufjs\/minimal\"/from 'protobufjs\/minimal.js'/g" ./dist/shared-state.js
rm dist/*.bak
