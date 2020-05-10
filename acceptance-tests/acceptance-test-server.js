const { createServer } = require('http')
const { start, stop, state } = require('../dist/index')

function send(message) {
  if (process.send) process.send(message)
  else console.log('server:', message)
}

const server = createServer((req, res) => {})
start(server, {some: 'state'}, id => {})

process.on('disconnect', () => {
  console.log('server:', 'closing server')
  stop()
  server.close(() => process.exit(0))
})

process.on('message', msg => {
  console.log('server:', msg)
  if (msg === 'listClients') send(state().clients)
})

server.listen(0, () => {
  send(server.address().port)
})
