import { createServer } from 'http'
import { ACTIONS, broadcast, metrics, send } from 'shared-state-server'
import { start, stop, state, update, clients, on } from 'shared-state-server'
import { listenToMessagesFromParentProcess, passActionsToParentProcess, sendToParentProcess } from './inter-process-messaging.js'

function log(message: any) {
  console.log('integration-test-server:', message)
}

const stateArgument = process.argv.find(arg => arg.startsWith('state=')) ?? ""
const initialState = JSON.parse(stateArgument.split('=')[1])
const server = createServer()

start(server, initialState, { debugLog: true });

process.on('exit', () => {
  log('Received disconnect event from the parent process, closing server')
  stop()
  server.close(() => process.exit(0))
});

listenToMessagesFromParentProcess({
  listClients: () => clients(),
  sendMessageToClient: ({ id, action, args }) => send(id, action, ...args),
  broadcastToAllClients: ({ id, action, args }) => broadcast(action, ...args),
  setState: (newState: any) => update(newState),
  getState: () => state(),
  getMetrics: (id: string) => metrics(id),
})

passActionsToParentProcess([
  ACTIONS.CONNECTED,
  ACTIONS.DISCONNECTED
], on)


server.listen(0, () => {
  const address = server.address()
  if (typeof address === 'object' && address !== null) {
    log(`listening on localhost:${address.port}`)
    sendToParentProcess({ method: 'started', params: address.port })
  }
})
