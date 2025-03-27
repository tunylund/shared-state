import logger from './logger.js'
import { act, ACTIONS, on, Action, off } from "./actions.js"
import { state } from "./state.js"
import { Socket } from "socket.io"
import { v4 as uuid } from 'uuid'

export interface Statistic { lag: number, dataTransferRate: number }
export type ID = string

const clientSockets = new Map<ID, Socket>()
const stats: {[id: string]: Statistic} = {}
const transferRates: {[key: string]: { amount: number, collectionStarted: number }} = {}

export function clients() {
  return Array.from(clientSockets.keys())
}

export function statistics(id: ID) {
  return stats[id]
}

export function createClient(socket: Socket): ID {
  const id = uuid()

  addClientSocket(id, socket)
  socket.on("disconnect", (reason, details) => {
    logger.debug(id, 'disconnect', reason, details)
    removeClientSocket(id, socket)
  })
  socket.on("message", (msg: string) => {
    const {action, attrs} = JSON.parse(msg.toString())
    logger.debug(id, 'message', action)
    act(id, action, ...(attrs || []))
  })

  return id
}

export function destroyClient(id: ID) {
  clientSockets.get(id)?.disconnect(true)
  clientSockets.get(id)?.removeAllListeners()
  clientSockets.delete(id)
  delete stats[id]
  delete transferRates[id]
  act(id, ACTIONS.CLOSE)
  off(id)
  broadcastClientStatsUpdate()
}

export function send(id: ID, action: Action, ...attrs: any) {
  const channel = clientSockets.get(id)
  if(channel && channel.connected) {
    const msg = JSON.stringify({action, attrs})
    collectTransferRate(id, msg)
    logger.debug(id, 'send', action)
    try { channel.emit("message", msg) }
    catch (err) { logger.error(id, `could not send to a '${id}' channel`, action) }
  } else {
    logger.debug(id, `could not send to a '${id}' channel`, action)
  }
}
  
export function broadcast(action: Action, ...attrs: any) {
  for (let id of clientSockets.keys()) {
    send(id, action, ...attrs)
  }
}

export function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any) {
  for (let id of clientSockets.keys()) {
    if (id !== notThisId) send(id, action, ...attrs)
  }
}

function collectTransferRate(id: ID, msg: string) {
  const collector = transferRates[id] = transferRates[id] || { amount: 0, collectionStarted: Date.now() }
  collector.amount += msg.length
  const timeCollected = Date.now() - collector.collectionStarted
  if (timeCollected > 1000) {
    const stat = ensureStatsExistForClient(id)
    stat.dataTransferRate = collector.amount / timeCollected
    collector.amount = 0
    collector.collectionStarted = Date.now()
    broadcastClientStatsUpdate()
  }
}

function updateLag(id: ID, lag: number) {
  const stat = ensureStatsExistForClient(id)
  stat.lag = lag
  broadcastClientStatsUpdate()
}

function ensureStatsExistForClient(id: ID): Statistic {
  const stat = stats[id] || {lag: Infinity, dataTransferRate: 0}
  stats[id] = stat
  return stat
}

function addClientSocket(id: ID, socket: Socket) {
  clientSockets.set(id, socket)
  ensureStatsExistForClient(id)
  send(id, ACTIONS.INIT, id, state())
  broadcastClientStatsUpdate()
  act(id, ACTIONS.CONNECTED)
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

function removeClientSocket(id: ID, socket: Socket) {
  if (clientSockets.get(id) === socket) {
    clientSockets.delete(id)
  }
}

function broadcastClientStatsUpdate() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
    statistics: stats
  })
}