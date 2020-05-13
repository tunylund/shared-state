#!/bin/sh
set -e

./node_modules/.bin/tsc -p tsconfig.notests.json

for f in `find dist -name '*.js'`; do
  sed -i '' -e "s/from ['\"]\\.\\(.*\\)['\"]/from '\\.\\1.js'/g" $f
done
