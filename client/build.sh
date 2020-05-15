#!/bin/sh
set -e

./node_modules/.bin/tsc

if [[ "$OSTYPE" == "darwin"* ]]; then
  SED="sed -i ''"
else
  SED="sed -i"
fi

for f in `find dist -name '*.js'`; do
  target=`echo $f | sed -e 's/\\.js/\\.mjs/'`
  echo "converting $f to $target"
  cp $f $target
  $SED -e "s/from ['\"]\\.\\(.*\\)['\"]/from '\\.\\1.mjs'/g" $target

  cp "$f.map" "$target.map"
  $SED "s/\\.js\\.map/\\.mjs\\.map/g" $target
  $SED "s/\\.js/\\.mjs/g" "$target.map"
done
