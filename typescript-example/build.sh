#!/bin/sh
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 

nvm use
( cd ../client && npm run build )
( cd ../server && npm run build )
( cd client-example && npm run build)
( cd server-example && npm run build)
