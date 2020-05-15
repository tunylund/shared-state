#!/bin/sh
set -e

./node_modules/.bin/tsc -p tsconfig.notests.json

if [[ "$OSTYPE" == "darwin"* ]]; then
  SED="sed -i ''"
else
  SED="sed -i"
fi

for f in `find dist -name '*.js'`; do
  $SED -e "s/from ['\"]\\.\\(.*\\)['\"]/from '\\.\\1.js'/g" $f
done
