#!/bin/sh
set -e

./node_modules/.bin/tsc

which sed

for f in `find dist -name '*.js'`; do
  target=`echo $f | sed -e 's/\\.js/\\.mjs/'`
  echo "converting $f to $target"
  cp $f $target
  sed -i '' -e "s/from ['\"]\\.\\(.*\\)['\"]/from '\\.\\1.mjs'/g" $target

  cp "$f.map" "$target.map"
  sed -i '' "s/\\.js\\.map/\\.mjs\\.map/g" $target
  sed -i '' "s/\\.js/\\.mjs/g" "$target.map"
done
