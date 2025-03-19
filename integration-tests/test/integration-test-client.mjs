import io from 'socket.io-client'
import { connect, on, ACTIONS, state, statistics } from 'shared-state-client'
import { RTCPeerConnection } from 'node-datachannel/polyfill'

global.RTCPeerConnection = RTCPeerConnection
global.io = io

function log(message) {
  console.log('integration-test-client:', message)
}

const port = process.argv.find(arg => arg.startsWith('port=')).split('=')[1]
log(`connecting to 'http://localhost:${port}'`)
const disconnect = connect(`http://localhost:${port}`)

process.on('disconnect', () => {
  log('Received disconnect event from the main process, closing client')
  disconnect()
})
process.on('message', msg => {
  log(msg)
  if(msg === 'getState') process.send(state())
  if(msg === 'getStatistics') process.send(statistics(myId))
  if(msg === 'getId') process.send(myId)
})

let myId = null
on(ACTIONS.INIT, id => myId = id)
on(ACTIONS.OPEN, () => process.send('connected'))
on(ACTIONS.ERROR, err => console.error('integration-test-client:', err))
