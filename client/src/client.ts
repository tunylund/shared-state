import logger from './logger.js'
import { on, ACTIONS, act } from './actions.js'
import { Socket } from 'socket.io-client'

export type ID = string
interface ClientStatistics {
  clients: ID[]
  statistics: { [id: string]: Statistic }
}
export interface Statistic { lag: number, dataTransferRate: number }
let stats: ClientStatistics = {
  clients: [],
  statistics: {}
}

let myId: ID
let _socket: Socket

on(ACTIONS.INIT, (id: ID) => {
  myId = id
})

export function addChannel(socket: Socket, lagInterval: number) {
  _socket = socket
  logger.debug('open socket')
  act(ACTIONS.OPEN)
  on(ACTIONS.CLIENT_UPDATE, (newStats: ClientStatistics) => stats = newStats)

  socket.on("connect", () => {
    logger.debug(`${myId}:`, 'connect socket')
    startLagPingPong(lagInterval)
  })

  socket.on("disconnect", (reason, details) => {
    logger.debug(`${myId}:`, 'close socket')
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
  return stats.clients
}

export function statistics(id: string) {
  return stats.statistics[id]
}
