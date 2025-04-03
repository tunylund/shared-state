import io from 'socket.io-client'
import { connect, on, ACTIONS, state, metrics } from 'shared-state-client'
import { listenToMessagesFromParentProcess, passActionsToParentProcess } from './inter-process-messaging.js'

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

listenToMessagesFromParentProcess({
  connect: () => {
    return new Promise(resolve => {
      on(ACTIONS.INIT, (id: string, initialState: any) =>  {
        myId = id
        resolve(myId)
      })
  
      log(`connecting to 'http://localhost:${port}'`)
      disconnect = connect(`http://localhost:${port}`, {
        debugLog: true
      })
    })
  },
  getState: () => state(),
  getStatistics: () => metrics(myId),
  getId: () => myId,
})

passActionsToParentProcess([
  ACTIONS.CONNECTED,
  ACTIONS.DISCONNECTED,
  'custom-action',
], on)
