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
```
import { update } from 'shared-state-server'
update<SomeState>({ new: 'state' })
```

The clients get the latest state on every change. Clients cannot change the state directly but they can communicate directly with the server via the `send()` and `on()` functions. Most commonly a client can ask the server
to perform updates.
```
// client
import { send } from 'shared-state-client'
send('please-change-the-state', 'some argument')

// server
import { on } from 'shared-state-server'
on('please-change-the-state', ('some argument') => { ... })
```

The clients can attach to a couple of predefined events. Most importantly `ACTIONS.INIT` will provide a uuid
that identifies the client and `ACTIONS.STATE_UPDATE` will notify when the state changes.
```
import { ACTIONS } from 'shared-state-client'
on(ACTIONS.INIT, (id: string) => myId = id)
on(ACTIONS.STATE_UPDATE, () => {...})
```

# Server usage
_A Simple example. For a more thorough example see the `ts-example` folder._
```
npm i --save shared-state-server
```

```
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
_A Simple example. For a more thorough example see the `ts-example` folder._
```
npm i --save shared-state-client socket.io-client
npm i --save-dev http-server
```

```
// main.mjs
import {
  connect, send, on, ACTIONS, state
} from 'node_modules/shared-state-client/dist/index.mjs'

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
```
// index.html
<script src="/node_modules/socket.io-client/dist/socket.io.js"></script>
<script type="module" src="main.mjs"></script>
```
```
./node_modules/.bin/http-server .
open localhost:8080
```

# API

## Shared State Server

### Setup

* `start(httpServerOrPort, initialState, onConnect, config?)`

    Initializes the SharedState server. This will open websocket and webrtc communication in the defined httpServer or portnumber.
    
    * `httpServerOrPort: Server|number`: An instance of http(s).Server or a port number. The Server will be bound to provide a websocket interface for establishing the connections. This will be directly passed to Socket.io.

    * `initialState: T extends State`: An object that contains the values for the initial state.

    * `onConnect: (id: string) => any`: when a new client connects, this callback will be called with the uuid of the new client.

    * `config: Config`: Configuration of the system.

* `stop()`

  Stop any active SharedState instances

* `interface Config`
  
  * `iceServers: {}[] (default: [])`: WebRTC communication relies on ICE Servers that allow
  the communication to be established across NAT and
  difficult networks. ICE servers are a combination of STUN servers and TURN servers.
    * STUN servers allow WebRTC to get real ips in networks 
  that utilize NATs (most do).
    * TURN servers will provide a proxy for clients that cannot
  establish WebRTC connections directly
  
    Your best bet of getting them is pay for it or build them or google heavily,

  * `peerTimeout: number (default 10000)`: Timeout in milliseconds for closing a peer when a client attempts to connect but cannot finalize the communication setup phase.

  * `debugLog: boolean (default false)`: Whether to log all the things to console.log.

  * `fastButUnreliable: boolean (default true)`: Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.
    
### Client-Server Communication

* `send(id: string, action: string, ...attrs: any)`

    Send a message to the defined client.

* `broadcast(action: string, ...attrs: any)`

    Send a message to all clients.

* `broadcastToOthers(notThisId: string, action: string, ...attrs: any)`

    Send a message to all clients except the defined id.

### State management

* `state<T extends State>(): T`

    Get the current state. You can use the TypeDefinition to make the return type be typed.

* `update<T extends State>(state: Partial<T>)`

    Update the state and broadcast to all known clients.

* `interface State`

  * `clients: string[]`: State will contain an array of connected client IDs. This is managed automatically by the system.

  * `lagStatistics: {[id: string]: number}`: State contains information about lag to each client.

### Events
_(it's not a proper library without it's own event management)_

* `on(id: string, action: string, fn: Function) {`

  Register a function that will be called when the the defined `action`
  is triggered from the client with the defined `id` using the `send` function.

* `off(id: string, action?: string, fn?: Function)`

  UnRegister a function or all functions for the `action` or even
  all actions for the defined `id`.

* `enum ACTIONS` Predefined actions that the system uses for basic setup
  * `OPEN` Triggered when a new client is happily connected.
  * `CLOSE` Triggered when a new client is happily connected.
  * `ERROR` Triggered with any error from the system
  * `PING` An action sent by the clients for gathering lag statistics
  * `STATE_INIT` An initial action for sending the initial state to the clients
  * `STATE_UPDATE` An action that is used to send state updates to the clients 


---

## Shared State Client

### Setup

* `connect(url: string, config = defaultConfig): () => void`

  Initialize the connection with the server. This will establish a WebSocket and WebRTC communication with the Shared-State-Server.

* `interface Config`
  * `lagInterval: number (default 3000)`: An interval in milliseconds for performing lagChecks. The result of the lagchecks are available in the `state` object.

  * `debugLog: boolean (default false)`: Whether to log all the things to console.log.

  * `fastButUnreliable: boolean (default true)`: Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.

### Client-Server Communication

* `send(action: string, ...attrs: any[])`: Send a message to the server.

### Events
_(because all libraries need events)_

* `on(action: string, fn: Function) {`

  Register a function that will be called when the the defined `action`
  is triggered from the server by using the `send` function.

* `off(action?: string, fn?: Function)`

  UnRegister a function or all functions for the `action`.

* `enum ACTIONS` Predefined actions that the system uses for basic setup
  * `INIT` An action that is used to get the ID from the server.
  * `OPEN` Triggered when the connection is happily established.
  * `CLOSE` Triggered when the connection is closed.
  * `ERROR` Triggered with any error from the system
  * `PING` An action sent by the clients for gathering lag statistics
  * `STATE_INIT` An initial action for getting the initial from the server
  * `STATE_UPDATE` An action that is used to get state updates from the server

### State Management

* `state<T extends State>(): T`: Get the current state. You can use the type definition T to make the return value be typed.
