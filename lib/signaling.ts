import socketIO from 'socket.io'
import { Server } from 'http'
import { buildPeer, ID, Config } from './transport'
import { init } from './gamestate'

let signalingServer: socketIO.Server|null = null

export function start(httpServer: Server, gameState: {}, onConnect: (id: ID) => void, config?: Config) {
  if (signalingServer) close()
  init(Object.assign({clients: [], ...gameState}))
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
