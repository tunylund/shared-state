# Shared State
Synchronized state between server and multiple clients using WebRTC and WebSockets.

# Server usage
```
npm i --save shared-state-server
```

```
import { createServer } from 'http'
import { start, state, update, on, State, ACTIONS } from 'gamestate-server'

interface GameState extends State {
  someValue: number
}
const initialState = { someValue: 0 }

const server = createServer((req, res) => {})

start(server, initialState, (id: string) => {
  on(id, 'input', value => update({ someValue: value }))
})

server.listen(3000, () => {
  console.log('a server with shared state is running at 3000')
})

```

# Client usage
```
npm i --save shared-state-client
```

```
import { connect, send, on, ACTIONS, state } from 'gamestate-client/dist/index'
import { State } from 'gamestate-client/dist/gamestate'

interface GameState extends State {
  value: number
}

connect('http://localhost:3000')

let myId: string
on(ACTIONS.INIT, (id: string) => myId = id)

on(ACTIONS.UPDATE, () => {
  const current = state<GameState>()
  console.log('current-value', current.value)
})

document.body.addEventListener('keyup', () => {
  send('input', Math.random())
})
```
