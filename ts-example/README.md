## An example of the usage of the Shared-State libraries

Run the client
```
nvm use
( cd ../client && npm run build )
( cd client && npm run build && npm run start )
```
Run the server
```
nvm use
( cd ../server && npm run build )
( cd server && npm run build && PORT=3000 npm run start )
```
```
open localhost:8080
```
