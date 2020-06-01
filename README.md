# Shared State
Synchronized state between server and multiple clients using WebRTC and WebSockets.

A shared state is the root of all evils in software development. However sometimes you just don't want to think about
the how, you just want a piece of JSON to be available on multiple clients and a server. Hence this library!

This library aims to implement the Star patter for state management:

```
o  o  o
 \ | /
o- * -o
 / | \
o  o  o Yay for Ascii Art!
```

The server (*) is in charge of changing the state and is the only one with access to the `update()` function.
```javascript
import { update } from 'shared-state-server'
update<SomeState>({ new: 'state' })
```

The clients get the latest state on every change. Clients cannot change the state directly but they can communicate directly with the server via the `send()` and `on()` functions. Most commonly a client can ask the server
to perform updates.
```javascript
// client
import { send } from 'shared-state-client'
send('please-change-the-state', 'some argument')

// server
import { on } from 'shared-state-server'
on('please-change-the-state', ('some argument') => { ... })
```

The clients can attach to a couple of predefined events. Most importantly `ACTIONS.INIT` will provide a uuid
that identifies the client and `ACTIONS.STATE_UPDATE` will notify when the state changes.
```javascript
import { ACTIONS } from 'shared-state-client'
on(ACTIONS.INIT, (id: string) => myId = id)
on(ACTIONS.STATE_UPDATE, () => {...})
```

This is library requires both a client library and a server library. Both available here:

https://www.npmjs.com/package/shared-state-server

https://www.npmjs.com/package/shared-state-client

# Server usage

```
npm i --save shared-state-server
```

```javascript
// index.mjs
import { createServer } from 'http'
import { start, update, on } from 'shared-state-server'

const server = createServer((req, res) => {})

const initialState = { someValue: 0 }

function changeState(value) {
  update({ someValue: value })
}

function setupClient(id) {
  on(id, 'input', changeState)
}

start(server, initialState, setupClient)

server.listen(3000, () => {
  console.log('a server with shared state is running at 3000')
})
```
```
node index.mjs
```

# Client usage
_A Simple example. For a more thorough example see the `typescript-example` folder._
```
npm i --save shared-state-client socket.io-client
npm i --save-dev http-server
```

```javascript
// main.mjs
import {
  connect, send, on, ACTIONS, state
} from 'node_modules/shared-state-client/dist/bundle.min.mjs'

connect('http://localhost:3000')

let myId
on(ACTIONS.INIT, (id) => myId = id)
on(ACTIONS.STATE_UPDATE, showState)

function showState() {
  document.body.innerText = state().someValue
}

document.body.addEventListener('keyup', () => {
  send('input', Math.random())
})
```
```html
// index.html
<script src="/node_modules/socket.io-client/dist/socket.io.js"></script>
<script type="module" src="main.mjs"></script>
```
```
./node_modules/.bin/http-server .
open localhost:8080
```

## Typescript example
For a more thorough example see the https://github.com/tunylund/shared-state/tree/master/typescript-example folder.

# Dependencies

The `shared-state-client` depends on `socket.io-client` library to be available in the global namespace. as the `io` object. Unfortunately it's a large library so it's best be left outside the library bundle file.

# API
See https://github.com/tunylund/shared-state/API.md for detailed api and design documentation.

