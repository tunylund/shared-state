import { Server as SocketIOServer } from 'socket.io'
import { init } from './state.js'
import { setLogLevel } from './logger.js'
import { createClient, ID } from './clients.js'
import { IceServer } from 'node-datachannel';

export interface Config {
  iceServers: (string|IceServer)[]
  peerTimeout: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string
}
const defaultConfig: Config = {
  iceServers: [],
  peerTimeout: 10000,
  debugLog: false,
  fastButUnreliable: true,
  path: '/shared-state'
}

let signalingServer: SocketIOServer|null = null

function validateConfiguration({iceServers}: Config) {
  for(let iceServer of (iceServers || [])) {
    if (typeof iceServer === 'string') {
      if (iceServer.includes('stun:') || iceServer.includes('turn:')) continue
      else throw new Error(`Ice Server urls must have 'stun:' or 'turn:' protocol defined: '${iceServer}' seems to not have it.`)
    }
  }
}

export function start(httpServerOrPort: any, initialState: {}, onConnect: (id: ID) => any, config?: Partial<Config>) {
  const conf = {...defaultConfig, ...config}
  validateConfiguration(conf)
  if (signalingServer) close()
  init(initialState)
  setLogLevel(conf.debugLog)
  signalingServer = new SocketIOServer(httpServerOrPort, { transports: ['websocket'], path: conf.path })
  signalingServer.on('connection', signalingSocket => {
    const id = createClient(signalingSocket)
    onConnect(id)
  })
}

export function stop() {
  if (signalingServer) {
    signalingServer.close()
    signalingServer = null
  }
}
