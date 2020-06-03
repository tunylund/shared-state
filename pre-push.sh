#!/bin/sh
set -e
grep -HnR --include "*.test.ts" "only" . && printf "\n\e[91mFound a test with '.only'-modifier. please remove it.\n" && exit 1

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
    cd integration-tests
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run test
)
(
    cd typescript-example/client
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run build
)
(
    cd typescript-example/server
    [ -d node_modules ] && npm i
    [ -d node_modules ] || npm ci
    npm run build
)

cp README.md client/README.md
cp README.md server/README.md
cp README.md docs/README.md

printf "\n \e[92mAll good! \o/ 🐶\n"
