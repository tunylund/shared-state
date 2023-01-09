#!/bin/sh
set -e

rm -rf dist

# ./node_modules/.bin/grpc_tools_node_protoc \
#   --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
#   --ts_proto_out=./src \
#   --ts_proto_opt=env=browser,outputServices=nice-grpc,outputServices=generic-definitions,outputJsonMethods=false,useExactTypes=false \
#   --proto_path=./proto \
#   ./proto/*.proto
./node_modules/.bin/grpc_tools_node_protoc \
  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src \
  --ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false,esModuleInterop=true \
  --proto_path=./proto \
  ./proto/*.proto
  
./node_modules/.bin/tsc

for f in `find dist -name '*.js'`; do
  target=`echo $f | sed "s/.js/.mjs/"`
  echo "converting $f to $target"
  cp $f $target
  sed -i.bak "s/from ['\"]\.\(.*\)['\"]/from '.\1.mjs'/g" $target
  sed -i.bak "s/\.js\.map/\.mjs\.map/g" $target

  cp "$f.map" "$target.map"
  sed -i.bak "s/\.js/\.mjs/g" "$target.map"
done
sed -i.bak -e "s/from \"protobufjs\/minimal\"/from 'protobufjs\/minimal.js'/g" ./dist/shared-state.mjs
rm dist/*.bak

./node_modules/.bin/rollup -c
ls -lah dist/bundle*
