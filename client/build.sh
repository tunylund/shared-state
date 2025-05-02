#!/bin/sh
set -e

echo "Building the client-library 🍃"

rm -rf dist
./node_modules/.bin/tsc

for f in `find dist -name '*.js'`; do
  target=`echo $f | sed "s/.js/.mjs/"`
  echo "converting $f to $target"
  cp $f $target
  sed -i.bak "s/from ['\"]\.\(.*\).js['\"]/from '.\1.mjs'/g" $target
  sed -i.bak "s/\.js\.map/\.mjs\.map/g" $target

  cp "$f.map" "$target.map"
  sed -i.bak "s/\.js/\.mjs/g" "$target.map"
done
rm dist/*.bak

./node_modules/.bin/rollup -c
ls -lah dist/bundle*

# assert bundle.mjs does not include socket io library code
if grep -q "socket.io-client" dist/bundle.mjs; then
  echo "\nError: bundle.mjs includes socket.io-client code. Please modify the code or rollup configuration to make sure the bundle does not include external library code."
  exit 1
fi

echo "Finished building the client-library 🍃"
