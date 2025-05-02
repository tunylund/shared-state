import logger, { setLogLevel } from './logger.js'
import { on, EVENTS, trigger, once } from './events.js'
import { startLagPingPong, stopLagPingPong } from './metrics.js'
// import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client'
// type SocketIOOptions = Partial<ManagerOptions & SocketOptions>

declare const io: any
type Socket = any
type SocketIOOptions = any

export type ID = string

let clientIds: ID[] = []
let myId: ID
let _socket: Socket

interface Config {
  lagInterval: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string,
  socketIOOptions: SocketIOOptions
}

const defaultConfig: Config = {
  lagInterval: 3000,
  debugLog: false,
  fastButUnreliable: true,
  path: '/shared-state',
  socketIOOptions: {}
}

export function connect(url: string, config?: Partial<Config>): () => void {
  const conf = {...defaultConfig, ...config}
  const socket = io(url, { 
    transports: ['websocket'], 
    path: conf.path,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 2000,
    ...conf.socketIOOptions 
  })
  setLogLevel(conf.debugLog)
  setupSocket(socket, conf.lagInterval)
  socket.io.on('reconnect_attempt', () => {
    logger.debug('reconnect_attempt', myId)
  })
  socket.io.on('reconnect', () => {
    logger.debug('reconnect', myId)
  })
  socket.on('error', (error: any) => trigger(EVENTS.ERROR, [error]))
  socket.on('connect_error', (error: any) => trigger(EVENTS.ERROR, [error]))
  socket.on('connect_timeout', (error: any) => trigger(EVENTS.ERROR, [error]))

  return () => socket.disconnect()
}

on(EVENTS.CLIENT_UPDATE, (newClientIds: ID[]) => {
  clientIds = newClientIds
})

on(EVENTS.INIT, (id: ID, _: any) => {
  if (myId === id) {
    logger.debug('init', myId, 'recovered the id')
  } else {
    myId = id
    logger.debug('init', myId, 'received a new ID')
  }
})

function waitForInitializationToComplete() {
  return Promise.all([
    new Promise<void>(resolve => once(EVENTS.CLIENT_UPDATE, () => resolve())),
    new Promise<void>(resolve => once(EVENTS.INIT, () => resolve())),
    new Promise<void>(resolve => once(EVENTS.CLIENT_METRICS_UPDATE, () => resolve()))
  ])
}

export function setupSocket(socket: Socket, lagInterval: number) {
  _socket = socket

  socket.on(EVENTS.SUGGEST_ID, (suggestedId: ID) => {
    if (!myId || myId === suggestedId) {
      logger.debug(EVENTS.SUGGEST_ID, myId, 'received a suggested id', suggestedId, 'accepting it')
      socket.emit(EVENTS.ACCEPT_ID, suggestedId)
    } else {
      logger.debug(EVENTS.SUGGEST_ID, myId, 'received a new ID', suggestedId, "but already have an ID, attempting to recover the previous id")
      socket.emit(EVENTS.SUGGEST_ID, myId)
    }
  })

  socket.on("connect", () => {
    startLagPingPong(lagInterval)
    logger.debug('connect', myId, 'socket connected')
    waitForInitializationToComplete().then(() => {
      trigger(EVENTS.CONNECTED, myId)
    })
  })

  socket.on("disconnect", (reason: string, details: any) => {
    stopLagPingPong()
    if (['io server disconnect', 'io client disconnect'].includes(reason)) {
      logger.debug('disconnect', myId, reason, details, "will not reconnect")
      socket.off()
      trigger(EVENTS.DISCONNECTED)
    } else {
      logger.debug('disconnect', myId, reason, details, "will try to reconnect")
    }
  });

  socket.on("connect_error", (error: Error) => {
    logger.error(`${myId}:`, error)
    trigger(EVENTS.ERROR, [error])
  })

  socket.on("message", (msg: string) => {
    logger.debug('message:', myId, msg)
    const {action, args} = JSON.parse(msg)
    trigger(action, ...(args ?? []))
  })
}

export function send(action: string, ...args: any[]) {
  if(_socket.connected) {
    _socket.send(JSON.stringify({action, args}))
  } else {
    logger.error(`${myId}: could not send to a disconnected socket`, action)
  }
}

export function clients() {
  return clientIds
}
