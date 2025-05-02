import { createServer } from 'http'
import { broadcast, metrics, off, send } from 'shared-state-server'
import { start, stop, state, update, clients, on } from 'shared-state-server'
import { registerChildProcessApi } from './inter-process-messaging.js'
import { ServerProcessApi } from './integration-test.test.ts'

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

registerChildProcessApi<ServerProcessApi>({

  listClients: async () => clients(),

  send: async (id: string, action: string, ...args: any[]) => send(id, action, ...args),

  broadcast: async (action: string, ...args: any[]) => broadcast(action, ...args),

  setState: async (newState: any) => update(newState),

  getState: () => state(),

  getMetrics: async (id: string) => metrics(id),

  waitForAction: (action: string, ...expectedArgs: any[]) => {
    return new Promise((resolve) => {
      const listener = (...args: any[]) => {
        if (expectedArgs.every(expectedArgument => args.includes(expectedArgument))) {
          off(action, listener)
          resolve(args)
        }
      }
      on(action, listener)
    })
  },

  disconnect: async () => {
    stop()
  }
})

server.listen(14000, () => {
  const address = server.address()
  if (typeof address === 'object' && address !== null) {
    log(`listening on ${address.address}:${address.port}`)
    process.send && process.send(address.port)
  }
})
