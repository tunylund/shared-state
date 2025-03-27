import { createServer } from 'http'
import { start, stop, state, update, clients } from 'shared-state-server'

function processSend(message: any) {
  process.send && process.send(message)
}

function log(message: string) {
  console.log('integration-test-server:', message)
}

const stateArg = process.argv.find(arg => arg.startsWith('state=')) ?? ""
const stateStr = stateArg.split('=')[1]
const initialState = JSON.parse(stateStr)
const server = createServer((req, res) => {})
start(server, initialState, (id: any) => {}, { debugLog: true })

process.on('disconnect', () => {
  log('Received disconnect event from the main process, closing server')
  stop()
  server.close(() => process.exit(0))
})

process.on('message', (msg: string) => {
  log(msg)

  if (msg === 'listClients') processSend(clients())
  else {
    update(msg)
    processSend(state())
  }
})

server.listen(0, () => {
  const address = server.address()
  if (typeof address === 'object' && address !== null) {
    log(`listening on localhost:${address.port}`)
    processSend(address.port)
  }
})
