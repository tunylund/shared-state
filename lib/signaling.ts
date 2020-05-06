import socketIO from 'socket.io'
import { Server } from 'http'
import { buildPeer, ID, Config } from './transport'

let signalingServer: socketIO.Server|null = null

export function start(httpServer: Server, onConnect: (id: ID) => void, config?: Config) {
  if (signalingServer) close()
  signalingServer = socketIO(httpServer, { transports: ['websocket'] })
  signalingServer.on('connection', signalingSocket => {
    const id = buildPeer(signalingSocket, config)
    onConnect(id)
  })
}

export function stop() {
  if (signalingServer) {
    signalingServer.close()
    signalingServer = null
  }
}
