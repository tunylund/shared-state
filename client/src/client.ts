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

on(ACTIONS.INIT, (id: ID, _: any) => {
  myId = id
})

export function addChannel(socket: Socket, lagInterval: number) {
  _socket = socket
  logger.debug('open socket')
  act(ACTIONS.CONNECTED)
  on(ACTIONS.CLIENT_UPDATE, (newClientIds: ID[]) => clientIds = newClientIds)
  on(ACTIONS.CLIENT_METRICS_UPDATE, (newClientMetrics: { [id: string]: ConnectionMetrics }) => clientMetrics = newClientMetrics)
  startLagPingPong(lagInterval)

  socket.on("connect", () => {
    logger.debug(`${myId}:`, 'connect socket')
  })

  socket.on("disconnect", (reason, details) => {
    logger.debug(`${myId}:`, 'close socket', reason, details)
    act(ACTIONS.CLOSE)
    socket.off()
    stopLagPingPong()
  });

  socket.on("connect_error", (error) => {
    logger.error(`${myId}:`, error)
    act(ACTIONS.ERROR, [error])
  })

  socket.on("message", (msg) => {
    logger.debug('message: ', msg)
    const {action, attrs} = JSON.parse(msg)
    act(action, attrs)
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

export function send(action: string, ...attrs: any[]) {
  if(_socket.connected) {
    _socket.send(JSON.stringify({action, attrs}))
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
