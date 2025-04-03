import logger from './logger.js'
import { on, ACTIONS, act } from './actions.js'
import { Socket } from 'socket.io-client'

export type ID = string
export interface ConnectionMetrics {
  lag: number,
  dataTransferRate: number
}
let clientIds: ID[] = []
let clientMetrics: { [id: ID]: ConnectionMetrics } = {}

let myId: ID
let _socket: Socket

const idResolutionWaiter = new Promise<void>(resolve => {
  on(ACTIONS.INIT, (id: ID, _: any) => {
    myId = id
    resolve()
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


Promise.all([idResolutionWaiter, clientUpdateWaiter, clientMetricsWaiter]).then(() => {
  act(ACTIONS.CONNECTED, myId)
})

export function addChannel(socket: Socket, lagInterval: number) {
  _socket = socket
  logger.debug('open socket')
  startLagPingPong(lagInterval)

  socket.on("connect", () => {
    logger.debug(`${myId}:`, 'connect socket')
  })

  socket.on("disconnect", (reason, details) => {
    logger.debug(`${myId}`, 'disconnect', reason, details)
    socket.off()
    stopLagPingPong()
    act(ACTIONS.DISCONNECTED)
  });

  socket.on("connect_error", (error) => {
    logger.error(`${myId}:`, error)
    act(ACTIONS.ERROR, [error])
  })

  socket.on("message", (msg) => {
    logger.debug('message: ', msg)
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
