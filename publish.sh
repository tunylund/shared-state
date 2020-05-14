#!/bin/sh
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Please provide a version number"
  exit 1
fi

npm run test
npm run build
npm version "$VERISON" -m "Bump to version $VERSION"
# create tarball
# push to git
npm publish . --dry-run
# upload to npm
# upload to github registry