import io from 'socket.io-client'
import { connect, on, ACTIONS, state, statistics } from 'shared-state-client'

(global as any).io = io

function log(message: string) {
  console.log('integration-test-client:', message)
}

function processSend (msg: any) {
  process.send && msg && process.send(msg)
}

const portArg = process.argv.find(arg => arg.startsWith('port='))
const port = portArg?.split('=')[1]
log(`connecting to 'http://localhost:${port}'`)
const disconnect = connect(`http://localhost:${port}`, { debugLog: true })

process.on('disconnect', () => {
  log('Received disconnect event from the main process, closing client')
  disconnect()
})
process.on('message', (msg: string) => {
  log(msg)
  if(msg === 'getState') processSend(state())
  if(msg === 'getStatistics') processSend(statistics(myId))
  if(msg === 'getId') processSend(myId)
})

let myId: string
on(ACTIONS.INIT, (id: string) => myId = id)
on(ACTIONS.CONNECTED, () => processSend('connected'))
on(ACTIONS.ERROR, (err: string) => console.error('integration-test-client:', err))
