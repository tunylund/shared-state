import logger from './logger.js'
import { act, ACTIONS, on, Action, off } from "./actions.js"
import { initState } from "./state.js"
import { Socket } from "socket.io"
import { v4 as uuid } from 'uuid'

export interface Statistic { lag: number, dataTransferRate: number }
export type ID = string

const channels = new Map<ID, Socket>()
const stats: {[id: string]: Statistic} = {}
const transferRates: {[key: string]: { amount: number, collectionStarted: number }} = {}

export function clients() {
  return Array.from(channels.keys())
}

export function statistics(id: ID) {
  return stats[id]
}

export function createClient(socket: Socket): ID {
  const id = uuid()

  addChannel(id, socket)
  socket.on("disconnect", (reason, details) => {
    logger.debug(id, 'disconnect', reason, details)
    removeChannel(id, socket)
  })
  socket.on("message", (msg: string) => {
    const {action, attrs} = JSON.parse(msg.toString())
    logger.debug(id, 'message', action)
    act(id, action, ...(attrs || []))
  })

  return id
}

export function destroyClient(id: ID) {
  channels.get(id)?.disconnect(true)
  channels.get(id)?.removeAllListeners()
  channels.delete(id)
  delete stats[id]
  delete transferRates[id]
  act(id, ACTIONS.CLOSE)
  off(id)
  updateClientStates()
}

export function send(id: ID, action: Action, ...attrs: any) {
  const channel = channels.get(id)
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
  for (let id of channels.keys()) {
    send(id, action, ...attrs)
  }
}

export function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any) {
  for (let id of channels.keys()) {
    if (id !== notThisId) send(id, action, ...attrs)
  }
}

function collectTransferRate(id: ID, msg: string) {
  const collector = transferRates[id] = transferRates[id] || { amount: 0, collectionStarted: Date.now() }
  collector.amount += msg.length
  const timeCollected = Date.now() - collector.collectionStarted
  if (timeCollected > 1000) {
    const stat = ensureStatsExist(id)
    stat.dataTransferRate = collector.amount / timeCollected
    collector.amount = 0
    collector.collectionStarted = Date.now()
    updateClientStates()
  }
}

function updateLag(id: ID, lag: number) {
  const stat = ensureStatsExist(id)
  stat.lag = lag
  updateClientStates()
}

function ensureStatsExist(id: ID): Statistic {
  const stat = stats[id] || {lag: Infinity, dataTransferRate: 0}
  stats[id] = stat
  return stat
}

function addChannel(id: ID, socket: Socket) {
  ensureStatsExist(id)
  channels.set(id, socket)
  send(id, ACTIONS.INIT, id)
  initState(id)
  updateClientStates()
  act(id, ACTIONS.OPEN)
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

function removeChannel(id: ID, socket: Socket) {
  if (channels.get(id) === socket) {
    channels.delete(id)
  }
}

function updateClientStates() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
    statistics: stats
  })
}