# API

## Shared State Server

### Setup

* `start(httpServerOrPort, initialState: {}, onConnect, config)` Initializes the SharedState server. This will open websocket and webrtc communication in the defined httpServer or portnumber.
  
  * `httpServerOrPort: Server|number`: An instance of http(s).Server or a port number. The Server will be bound to provide a websocket interface for establishing the connections. This will be directly passed to Socket.io.

  * `initialState: {}`: An object that contains the values for the initial state.

  * `onConnect: (id: string) => any`: when a new client connects, this callback will be called with the uuid of the new client.

  * `config: Config`: Configuration of the system.

* `stop()`

  Stop any active SharedState instances

### Setup

* `start(httpServerOrPort, initialState, onConnect, config: Partial<Config>)`

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
    * see https://webrtc.org/getting-started/turn-server

    If your not doing just `localhost`, you will definitely need STUN and TURN Servers.
  
    Your best bet of getting them is pay for it (e.g. https://twilio.com) or host an open source server. (e.g. https://github.com/coturn/coturn).

  * `peerTimeout: number (default 10000)`: Timeout in milliseconds for closing a peer when a client attempts to connect but cannot finalize the communication setup phase.

  * `debugLog: boolean (default false)`: Whether to log all the things to console.log.

  * `fastButUnreliable: boolean (default true)`: Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.

  * `path: string (default /shared-state)`: A path component to which the socket interface attaches to.
    
### Client-Server Communication

* `send(id: string, action: string, ...attrs: any)`

    Send a message to the defined client.

* `broadcast(action: string, ...attrs: any)`

    Send a message to all clients.

* `broadcastToOthers(notThisId: string, action: string, ...attrs: any)`

    Send a message to all clients except the defined id.

### State management

* `state<T>(): T`

    Get the current state. You can use the TypeDefinition to make the return type be typed.

* `update<T>(state: <T>)`

    Update the state and broadcast to all known clients.

  ```typescript
  interface GameState { someValue: string }
  const current = state<GameState>()
  current.someValue = 'new-value'
  update<GameState>(current)
  ```

### Events

* `on(id: string, action: string, fn: Function)`

  Register a function that will be called when the the defined `action`
  is triggered from the client with the defined `id` using the `send` function.
  ```typescript
  on('some-client-id', 'say-hello', (msg) => console.log(msg))
  ```

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
  * `CLIENT_UPDATE` An action that is used to send client status updates to the clients


---

## Shared State Client

### Setup

* `connect(url: string, config: Partial<Config>): () => void`

  Initialize the connection with the server. This will establish a WebSocket and WebRTC communication with the Shared-State-Server.

* `interface Config`
  * `lagInterval: number (default 3000)`: An interval in milliseconds for performing lagChecks. The result of the lagchecks are available in the `state` object.

  * `debugLog: boolean (default false)`: Whether to log all the things to console.log.

  * `fastButUnreliable: boolean (default true)`: Whether to prefer fast but unreliable communication (unordered UDP) or slow but reliable (ordered TCP with 150ms message timeout). Please use the same value for client and the server.

  * `path: string (default /shared-state)`: A path component at which the shared state server is listening.

### Client-Server Communication

* `send(action: string, ...attrs: any[])`: Send a message to the server.

  ```typescript
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
  * `PING` An action sent by the clients for gathering lag statistics
  * `STATE_INIT` An initial action for getting the initial from the server
  * `STATE_UPDATE` An action that is used to get state updates from the server
  * `CLIENT_UPDATE` An action that is used to get client status updates from the server

### State Management

* `state<T>(): T`: Get the current state. You can use the type definition T to make the return value be typed.
  ```typescript
  interface GameState { someValue: string }
  const current = state<GameState>()
  console.log(current.someValue)
  ```
