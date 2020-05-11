#!/bin/sh
set -e

(
    cd client
    npm run build
    npm run test
)
(
    cd server
    npm run build
    npm run test
)
(
    cd acceptance-tests
    npm run test
)

echo "remember to commit all changes..."