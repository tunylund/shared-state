import { start, stop, state, update, clients } from 'shared-state-server'

function send(message) {
  if (process.send) process.send(message)
  else log(message)
}

function log(message) {
  console.log(process.pid, 'integration-test-server:', message)
}

const initialState = JSON.parse(process.argv.find(arg => arg.startsWith('state=')).split('=')[1])
await start(8081, initialState, id => {})

process.on('disconnect', () => {
  log('closing server')
  stop()
})

process.on('message', msg => {
  log(msg)
  if (msg === 'listClients') send(clients())
  else {
    update(msg)
    send(state())
  }
})

send(8081)
