import { createServer } from 'http'
import { start, stop, state, update, clients } from 'shared-state-server'

function send(message) {
  if (process.send) process.send(message)
  else log(message)
}

function log(message) {
  console.log('integration-test-server:', message)
}

const initialState = JSON.parse(process.argv.find(arg => arg.startsWith('state=')).split('=')[1])
const server = createServer((req, res) => {})
start(server, initialState, id => {})

process.on('disconnect', () => {
  log('closing server')
  stop()
  server.close(() => process.exit(0))
})

process.on('message', msg => {
  log(msg)
  if (msg === 'listClients') send(clients())
  else {
    update(msg)
    send(state())
  }
})

server.listen(0, () => {
  send(server.address().port)
})
