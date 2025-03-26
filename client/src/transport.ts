import { act, ACTIONS } from './actions.js'
import { setLogLevel } from './logger.js'
import { addChannel } from './client.js'

declare var io: any;
declare type Socket = any;


interface Config {
  lagInterval: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string
}

const defaultConfig: Config = {
  lagInterval: 3000,
  debugLog: false,
  fastButUnreliable: true,
  path: '/shared-state'
}

export function connect(url: string, config?: Partial<Config>): () => void {
  const conf = {...defaultConfig, ...config}
  const socket = io.connect(url, { transports: ['websocket'], path: conf.path })
  setLogLevel(conf.debugLog)
  socket.on('connect', () => {
    addChannel(socket, conf.lagInterval)
  })
  socket.on('error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_timeout', (error: any) => act(ACTIONS.ERROR, [error]))

  return disconnect.bind({}, socket)
}

function disconnect(socket: Socket) {
  socket.disconnect()
}
