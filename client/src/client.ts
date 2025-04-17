import logger, { setLogLevel } from './logger.js'
import { on, ACTIONS, act } from './actions.js'
import { io, Socket } from 'socket.io-client'

export type ID = string
export interface ConnectionMetrics {
  lag: number,
  dataTransferRate: number
}

let clientIds: ID[] = []
let clientMetrics: { [id: ID]: ConnectionMetrics } = {}
let myId: ID
let _socket: Socket

interface Config {
  lagInterval: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string,
  socketIOOptions: any
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
  socket.on('error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_timeout', (error: any) => act(ACTIONS.ERROR, [error]))

  return () => socket.disconnect()
}

export function setupSocket(socket: Socket, lagInterval: number) {
  _socket = socket

  const idNegotiationWaiter = new Promise<ID>(resolve => {
    on(ACTIONS.INIT, (id: ID, _: any) => {
      if (myId === id) {
        logger.debug('init', myId, 'recovered the id')
      } else {
        myId = id
        logger.debug('init', myId, 'received a new ID')
      }
      resolve(myId)
    })
  })
  
  const clientUpdateWaiter = new Promise<void>(resolve => {
    on(ACTIONS.CLIENT_UPDATE, (newClientIds: ID[]) => {
      clientIds = newClientIds
      resolve()
    })
  })
  
  const clientMetricsWaiter = new Promise<void>(resolve => {
    on(ACTIONS.CLIENT_METRICS_UPDATE, (newClientMetrics: { [id: string]: ConnectionMetrics }) => {
      clientMetrics = newClientMetrics
      resolve()
    })
  })
  
  Promise.all([idNegotiationWaiter, clientUpdateWaiter, clientMetricsWaiter]).then(() => {
    act(ACTIONS.CONNECTED, myId)
  })

  socket.on(ACTIONS.SUGGEST_ID, (suggestedId: ID) => {
    if (!myId || myId === suggestedId) {
      logger.debug(ACTIONS.SUGGEST_ID, myId, 'received a suggested id', suggestedId, 'accepting it')
      socket.emit(ACTIONS.ACCEPT_ID, suggestedId)
    } else {
      logger.debug(ACTIONS.SUGGEST_ID, myId, 'received a new ID', suggestedId, "but already have an ID, attempting to recover the previous id")
      socket.emit(ACTIONS.SUGGEST_ID, myId)
    }
  })

  socket.on("connect", () => {
    startLagPingPong(lagInterval)
    if (myId) {
      logger.debug('connect', myId, 'socket connected, requesting recovery of previous id')
    } else{
      logger.debug('connect', myId, 'socket connected for the first time')
    }
  })

  socket.on("disconnect", (reason, details) => {
    stopLagPingPong()
    if (['io server disconnect', 'io client disconnect'].includes(reason)) {
      logger.debug('disconnect', myId, reason, details, "will not reconnect")
      socket.off()
      act(ACTIONS.DISCONNECTED)
    } else {
      logger.debug('disconnect', myId, reason, details, "will try to reconnect")
    }
  });

  socket.on("connect_error", (error) => {
    logger.error(`${myId}:`, error)
    act(ACTIONS.ERROR, [error])
  })

  socket.on("message", (msg) => {
    logger.debug('message:', myId, msg)
    const {action, args} = JSON.parse(msg)
    act(action, ...(args ?? []))
  })
}

let lagPingTimeout: any
function startLagPingPong(lagInterval: number) {
  function ping() {
    send(ACTIONS.PING, Date.now())
    lagPingTimeout = setTimeout(ping, lagInterval)
  }
  ping()
}
function stopLagPingPong() {
  clearTimeout(lagPingTimeout)
  lagPingTimeout = null
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

export function metrics(id: ID) {
  return clientMetrics[id]
}
