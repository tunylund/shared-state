import { ID } from "./transport"
import logger from './logger'
import { act, ACTIONS, on, Action, off } from "./actions"
import { initState } from "./state"
import { DataChannel } from "node-datachannel/*"

export interface Statistic { lag: number, dataTransferRate: number }

const channels = new Map<ID, Set<DataChannel>>()
const stats: {[id: string]: Statistic} = {}
const transferRates: {[key: string]: { amount: number, collectionStarted: number }} = {}

export function clients() {
  return Array.from(channels.keys())
}

export function statistics(id: ID) {
  return stats[id]
}

export function createClient(id: ID, channel: DataChannel) {
  channel.onOpen(() => {
    logger.debug(id, `data-channel:`, 'open')
    addChannel(id, channel)
  })
  channel.onClosed(() => {
    logger.debug(id, `data-channel:`, 'close')
    removeChannel(id, channel)
  })
  channel.onError((error: string) => {
    logger.error(id, `data-channel:`, error)
    act(id, ACTIONS.ERROR, error)
  })
  channel.onMessage((msg: string | Buffer | ArrayBuffer) => {
    const {action, attrs} = JSON.parse(msg.toString())
    logger.debug(id, `data-channel:`, action)
    act(id, action, ...(attrs || []))
  })
  channel.onBufferedAmountLow(() => {
    logger.debug(id, `data-channel:`, 'buffered amount low')
  })
}

export function destroyClient(id: ID) {
  channels.get(id)?.forEach(ch => ch.close())
  channels.delete(id)
  delete stats[id]
  delete transferRates[id]
  act(id, ACTIONS.CLOSE)
  off(id)
  updateClientStates()
}

export function send(id: ID, action: Action, ...attrs: any) {
  channels.get(id)?.forEach(channel => {
    if(channel.isOpen()) {
      const msg = JSON.stringify({action, attrs})
      collectTransferRate(id, msg)
      logger.debug(id, 'send', action)
      try { channel.sendMessage(msg) }
      catch (err) { logger.error(id, `could not send to a '${id}' channel`, action) }
    } else {
      logger.debug(id, `could not send to a '${id}' channel`, action)
    }
  })
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

function ensureChannelSetExists(id: ID): Set<DataChannel> {
  const chs = channels.get(id) || new Set<DataChannel>()
  channels.set(id, chs)
  return chs
}

function ensureStatsExist(id: ID): Statistic {
  const stat = stats[id] || {lag: Infinity, dataTransferRate: 0}
  stats[id] = stat
  return stat
}

function addChannel(id: ID, channel: DataChannel) {
  ensureStatsExist(id)
  const currentChannels = ensureChannelSetExists(id)
  currentChannels.add(channel)
  for (let ch of currentChannels) if(ch !== channel) ch.close()
  initState(id)
  updateClientStates()
  act(id, ACTIONS.OPEN)
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

function removeChannel(id: ID, channel: DataChannel) {
  const currentChannels = ensureChannelSetExists(id)
  currentChannels.delete(channel)
  if (currentChannels.size === 0) destroyClient(id)
}

function updateClientStates() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
    statistics: stats
  })
}