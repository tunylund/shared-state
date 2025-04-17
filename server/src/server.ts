import { ServerOptions, Server as SocketIOServer } from 'socket.io'
import { init } from './state.js'
import { setLogLevel } from './logger.js'
import { connectClient, ID } from './clients.js'
import { ACTIONS, off, on } from './actions.js'
import { updateLag } from './metrics.js'

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
  if (server) close()
  init(initialState)
  setLogLevel(conf.debugLog)
  server = new SocketIOServer(httpServerOrPort, {
    transports: ['websocket'],
    ...conf.socketIOOptions
  })
  server.on('connection', signalingSocket => connectClient(signalingSocket))
  on(ACTIONS.PING, (id: string, theirTime: number) => updateLag(id, Date.now() - theirTime))
}

export function stop() {
  if (server) {
    off(ACTIONS.PING)
    server.disconnectSockets(true)
    server.close()
    server = null
  }
}
