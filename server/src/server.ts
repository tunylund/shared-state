import { ServerOptions, Server as SocketIOServer } from 'socket.io'
import { init } from './state.js'
import { setLogLevel } from './logger.js'
import { connectClient } from './clients.js'

export interface Config {
  peerTimeout: number
  debugLog: boolean
  fastButUnreliable: boolean
  socketIOOptions: Partial<ServerOptions>
}
const defaultConfig: Config = {
  peerTimeout: 10000,
  debugLog: false,
  fastButUnreliable: true,
  socketIOOptions: {
    path: '/shared-state',
  }
}

let server: SocketIOServer|null = null

export function start(httpServerOrPort: any, initialState: {}, config?: Partial<Config>) {
  const conf = {...defaultConfig, ...config}
  if (server) stop()
  init(initialState)
  setLogLevel(conf.debugLog)
  server = new SocketIOServer(httpServerOrPort, {
    transports: ['websocket'],
    ...conf.socketIOOptions
  })
  server.on('connection', signalingSocket => connectClient(signalingSocket))
}

export function stop() {
  if (server) {
    server.disconnectSockets(true)
    server.close()
    server = null
  }
}
