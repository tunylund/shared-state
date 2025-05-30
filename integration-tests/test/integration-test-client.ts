import io from 'socket.io-client'
import { connect, on, EVENTS, state, metrics, off } from 'shared-state-client'
import { registerChildProcessApi } from './inter-process-messaging.js'
import { ClientProcessApi } from './integration-test.test.ts'

(global as any).io = io

function log(message: any) {
  console.log('integration-test-client:', message)
}

const portArg = process.argv.find(arg => arg.startsWith('port='))
const port = portArg?.split('=')[1]
let myId: string
let disconnect: () => void = () => {}

process.on('exit', () => {
  log('Received disconnect event from the main process, closing client')
  disconnect()
})

on(EVENTS.CONNECTED, (id: string) =>  {
  myId = id
})

registerChildProcessApi<ClientProcessApi>({

  connect: () => {
    return new Promise(resolve => {
      on(EVENTS.CONNECTED, (id: string) =>  {
        resolve(id)
      })
  
      log(`connecting to 'http://127.0.0.1:${port}'`)
      disconnect = connect(`http://127.0.0.1:${port}`, {
        debugLog: true,
        socketIOOptions: {
          timeout: 100
        }
      })
    })
  },

  disconnect: async () => {
    disconnect()
  },

  getState: () => state(),

  getMetrics: async () => metrics(myId),

  getId: async () => myId,

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
  }
})

process.send && process.send('started')
