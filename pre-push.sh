#!/bin/sh
set -e

(
    cd client
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run build
    npm run test
)
(
    cd server
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run build
    npm run test
)
(
    cd acceptance-tests
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run test
)

echo "remember to commit all changes..."