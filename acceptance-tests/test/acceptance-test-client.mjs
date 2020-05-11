//@ts-ignore
import wrtc from 'wrtc'
import io from 'socket.io-client'
import { connect, on } from 'gamestate-client'

global.RTCPeerConnection = wrtc.RTCPeerConnection
global.io = io

const port = process.argv.find(arg => arg.startsWith('port=')).split('=')[1]
console.log('client:', `connecting to 'http://localhost:${port}'`)
const disconnect = connect(`http://localhost:${port}`)

on('open', () => process.send('connected'))
on('socket-error', err => console.error(err))

let currentState = {}
on('gamestate-init', state => currentState = state)
on('gamestate-update', state => currentState = {...currentState, ...state})

process.on('disconnect', () => {
  disconnect()
})

process.on('message', msg => {
  console.log('client:', msg)
  if(msg === 'getState') process.send(currentState)
})
