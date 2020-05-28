#!/bin/sh
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Please provide a version number"
  exit 1
fi

USER=`npm whoami`
echo "publishing version $VERSION as $USER"

./pre-push.sh
(
  cd server
  npm version $VERSION -m "Bump to version $VERSION"
  npm publish .
)
(
  cd client
  npm version $VERSION -m "Bump to version $VERSION"
  npm publish .
)
