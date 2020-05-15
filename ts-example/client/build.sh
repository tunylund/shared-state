#!/bin/sh
set -e

./node_modules/.bin/tsc

for f in `find dist -name '*.js'`; do
  target=`echo $f | sed -e 's/\\.js/\\.mjs/'`
  echo "converting $f to $target"

  mv $f $target
  sed -i '' -e "s/from '\\.\\(.*\\)'/from '\\.\\1.mjs'/g" $target
  sed -i '' -e "s/from 'tiny-game-engine\\(.*\\)'/from '\\.\\.\\/node_modules\\/tiny-game-engine\\1.mjs'/g" $target
  sed -i '' -e "s/from 'shared-state-client\\(.*\\)'/from '\\.\\.\\/node_modules\\/shared-state-client\\1.mjs'/g" $target

done
