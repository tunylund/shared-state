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
send('please-change-the-state', 'some value')

// server
import { on, update } from 'shared-state-server'
on('please-change-the-state', value => update({ value }))
```

The clients can attach to a couple of predefined events. Most importantly `ACTIONS.INIT` will provide a uuid
that identifies the client and `ACTIONS.STATE_UPDATE` will notify when the state has changed. The actual changes are managed automatically.
```javascript
import { ACTIONS, state } from 'shared-state-client'
on(ACTIONS.INIT, (id: string) => myId = id)
on(ACTIONS.STATE_UPDATE, () => console.log(state()))
```

This is library requires both a client library and a server library. Both available respectively here:

https://www.npmjs.com/package/shared-state-server

https://www.npmjs.com/package/shared-state-client

## Server usage

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

## Client usage
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

# Dependencies

The `shared-state-client` depends on `socket.io-client` library to be available in the global namespace. as the `io` object. Unfortunately it's a large library so it's best be left outside the library bundle file.

See: https://socket.io/docs/client-api/


# API

## Shared State Server

### Setup

`start(httpServerOrPort, initialState, onConnect, config)`

  Initializes the SharedState server. This will open websocket and webrtc communication in the defined httpServer or portnumber.
  
  * `httpServerOrPort: Server|number`: An instance of http(s).Server or a port number. The Server will be bound to provide a websocket interface for establishing the connections. This will be directly passed to Socket.io.

  * `initialState: {}`: An object that contains the values for the initial state.

  * `onConnect: (id: string) => any`: when a new client connects, this callback will be called with the uuid of the new client.

  * `config: Config`: Configuration of the system.

    * `iceServers: { urls: string|string[], username?: string, credential?: string }[]` _= []_ : WebRTC communication relies on ICE Servers that allow
    the communication to be established across NAT and
    difficult networks. ICE servers are a combination of STUN servers and TURN servers.
      
      * STUN servers allow WebRTC to get real ips in networks 
      that utilize NATs (most do).
      
      * TURN servers will provide a proxy for clients that cannot
      establish WebRTC connections directly
      
      For more information, see https://webrtc.org/getting-started/turn-server

      If your not doing just `localhost`, you will definitely need STUN and TURN Servers.
    
      Your best bet of getting them is pay for it (e.g. https://twilio.com) or host an open source server. (e.g. https://github.com/coturn/coturn).

    * `peerTimeout: number` _= 10000_ : Timeout in milliseconds for closing a peer when a client attempts to connect but cannot finalize the communication setup phase.

    * `debugLog: boolean` _= false_ : Whether to log all the things to console.log.

    * `fastButUnreliable: boolean` _= true_ : Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.

    * `path: string` _= /shared-state_ : A path component to which the socket interface attaches to.

  ```javascript
    start('3000', {some: 'value'}, id => console.log(id), {
      iceServers: [
        { "urls": "stun:global.stun.twilio.com:3478?transport=udp" },
        { "urls": "turn:global.turn.twilio.com:3478?transport=udp", "username": "foo", "credential": "bar" }
      ]
    })
  ```

* `stop()`

  Stop any active SharedState instances

### Client-Server Communication

* `send(id: string, action: string, ...attrs: any)`

  Send a message to the defined client.

* `broadcast(action: string, ...attrs: any)`

  Send a message to all clients.

* `broadcastToOthers(notThisId: string, action: string, ...attrs: any)`

  Send a message to all clients except the defined id.

* `clients(): string[]`

  Get a list of connected client ids

* `statistics(): { [id]: { lag: number }}`

  Get usage statistics of the system.

### State management

* `state<T>(): T`

    Get the current state. You can use the TypeDefinition to make the return type be typed.

* `update<T>(state: <T>)`

    Update the state and broadcast to all known clients. `update()` expects the whole state object to be always passed to it. Any differences with the previous state are automagically calculated and the diffs are sent to all the clients.

  ```javascript
  interface GameState { someValue: string }
  const current = state<GameState>()
  current.someValue = 'new-value'
  update<GameState>(current)
  ```

### Events

* `on(id: string, action: string, fn: Function)`

  Register a function that will be called when the the defined `action`
  is triggered from the client with the `id`.
  ```javascript
  // server
  on('some-client-id', 'say-hello', msg => console.log(msg))

  // client with some-client-id
  send('say-hello', 'wassup?')
  ```

* `off(id: string, action?: string, fn?: Function)`

  De-register a function or all functions for the `id` and `action`.
  If the `action` is omitted, de-registers everything for the `id`.

* `enum ACTIONS` Predefined actions that the system uses for basic setup
  * `OPEN` Triggered when a new client is happily connected.
  * `CLOSE` Triggered when a new client is happily connected.
  * `ERROR` Triggered with any error from the system
  * `PING` An action sent by the clients for gathering lag statistics
  * `STATE_INIT (internal)` An initial action for sending the initial state to the clients
  * `STATE_UPDATE` An action that is used to send state updates to the clients
  * `CLIENT_UPDATE (internal)` An action that is used to send client status updates to the clients


---

## Shared State Client

### Setup

* `connect(url: string, config: Partial<Config>): () => void`

  Initialize the connection with the server. This will establish a WebSocket and WebRTC communication with the Shared-State-Server. The return value is a function that will `disconnect` any connection when called.

* `interface Config`

  * `iceServers: { urls: string|string[], username?: string, credential?: string }[]` _= []_ : Should be the same value as server configuration for ice servers.

  * `lagInterval: number` _= 3000_ : An interval in milliseconds for performing lagChecks. The result of the lagchecks are available from the `statistics()` function.

  * `debugLog: boolean` _= false_ : Whether to log all the things to console.log.

  * `fastButUnreliable: boolean` _= true_ : Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.

  * `path: string` _= /shared-state_ : A path component at which the shared state server is listening.

  ```javascript
    const disconnect = connect('localhost:3000', {
      iceServers: [
        { "urls": "stun:global.stun.twilio.com:3478?transport=udp" },
        { "urls": "turn:global.turn.twilio.com:3478?transport=udp", "username": "foo", "credential": "bar" }
      ]
    })
  ```

### Client-Server Communication

* `send(action: string, ...attrs: any[])`: Send a message to the server.

  ```javascript
  send('say-hello', 'honey!', 'i do be home!')
  ```

### Events
_(because all libraries need events)_

* `on(action: string, fn: Function)`

  Register a function that will be called when the the defined `action`
  is triggered from the server by using the `send` function.

* `off(action?: string, fn?: Function)`

  UnRegister a function or all functions for the `action`.

* `enum ACTIONS` Predefined actions that the system uses for basic setup
  * `INIT` An action that is used to get the ID from the server.
  * `OPEN` Triggered when the connection is happily established.
  * `CLOSE` Triggered when the connection is closed.
  * `ERROR` Triggered with any error from the system
  * `PING (internal)` An action sent by the clients for gathering lag statistics
  * `STATE_INIT (internal)` An initial action for getting the initial from the server
  * `STATE_UPDATE` An action that is used to get state updates from the server. The state changes are managed automatigally
  * `CLIENT_UPDATE (internal)` An action that is used to get client status updates from the server

### State Management

* `state<T>(): T`: Get the current state. You can use the type definition T to make the return value be typed.
  ```javascript
  interface GameState { someValue: string }
  const {someValue} = state<GameState>()
  console.log(someValue)
  ```

# Examples

A simple typescript setup: https://github.com/tunylund/shared-state/tree/master/typescript-example

An online multiplayer game: https://github.com/tunylund/atomicwedgie
 

