import { Server as SocketIOServer } from 'socket.io'
import { init } from './state.js'
import { setLogLevel } from './logger.js'
import { createClient, ID } from './clients.js'

export interface Config {
  peerTimeout: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string
}
const defaultConfig: Config = {
  peerTimeout: 10000,
  debugLog: false,
  fastButUnreliable: true,
  path: '/shared-state'
}

let server: SocketIOServer|null = null

export function start(httpServerOrPort: any, initialState: {}, onConnect: (id: ID) => any, config?: Partial<Config>) {
  const conf = {...defaultConfig, ...config}
  if (server) close()
  init(initialState)
  setLogLevel(conf.debugLog)
  server = new SocketIOServer(httpServerOrPort, { transports: ['websocket'], path: conf.path })
  server.on('connection', signalingSocket => {
    const id = createClient(signalingSocket)
    onConnect(id)
  })
}

export function stop() {
  if (server) {
    server.close()
    server = null
  }
}
