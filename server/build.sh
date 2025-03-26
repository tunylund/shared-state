#!/bin/sh
set -e

echo "Building Server 🤖"

./node_modules/.bin/tsc -p tsconfig.notests.json
