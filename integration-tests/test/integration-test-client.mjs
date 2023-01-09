import { connect, on, ACTIONS, state, statistics } from 'shared-state-client'

function log(message) {
  console.log(process.pid, 'integration-test-client:', message)
}

let myId = null
on(ACTIONS.INIT, id => {
  myId = id
  process.send('connected')
})
on(ACTIONS.ERROR, err => console.error('integration-test-client:', err))

process.on('disconnect', () => {
  log('closing client')
  disconnect()
})
process.on('message', msg => {
  log(msg)
  if(msg === 'getState') process.send(state())
  if(msg === 'getStatistics') process.send(statistics(myId))
  if(msg === 'getId') process.send(myId)
})

const port = process.argv.find(arg => arg.startsWith('port=')).split('=')[1]
log(`connecting to 'http://localhost:${port}'`)
const disconnect = await connect(`http://localhost:${port}`)