import { ID } from "./transport"
import logger from './logger'
import { act, ACTIONS, on, Action, off } from "./actions"
import { initState } from "./state"

interface Statistic { lag: number, dataTransferRate: number }
const channels = new Map<ID, Set<RTCDataChannel>>()
const stats: {[id: string]: Statistic} = {}
const transferRates: {[key: string]: { amount: number, collectionStarted: number }} = {}

export function clients() {
  return Array.from(channels.keys())
}

export function statistics() {
  return stats
}

export function createClient(id: ID, channel: RTCDataChannel) {
  channel.onopen = () => {
    logger.debug(id, `data-channel:`, 'open')
    addChannel(id, channel)
  }
  channel.onclose = () => {
    logger.debug(id, `data-channel:`, 'close')
    channel.onerror = channel.onmessage = null
    removeChannel(id, channel)
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return
    logger.error(id, `data-channel:`, error)
    act(id, ACTIONS.ERROR, error)
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    logger.debug(id, `data-channel:`, action)
    act(id, action, ...(attrs || []))
  }
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
    if(channel.readyState === 'open') {
      const msg = JSON.stringify({action, attrs})
      collectTransferRate(id, msg)
      logger.debug(id, 'send', action)
      try { channel.send(msg) }
      catch (err) { logger.error(id, `could not send to a '${channel.readyState}' channel`, action) }
    } else {
      logger.debug(id, `could not send to a '${channel.readyState}' channel`, action)
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

function ensureChannelSetExists(id: ID): Set<RTCDataChannel> {
  const chs = channels.get(id) || new Set<RTCDataChannel>()
  channels.set(id, chs)
  return chs
}

function ensureStatsExist(id: ID): Statistic {
  const stat = stats[id] || {lag: Infinity, dataTransferRate: 0}
  stats[id] = stat
  return stat
}

function addChannel(id: ID, channel: RTCDataChannel) {
  ensureStatsExist(id)
  const currentChannels = ensureChannelSetExists(id)
  currentChannels.add(channel)
  for (let ch of currentChannels) if(ch !== channel) ch.close()
  initState(id)
  updateClientStates()
  act(id, ACTIONS.OPEN)
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

function removeChannel(id: ID, channel: RTCDataChannel) {
  const currentChannels = ensureChannelSetExists(id)
  currentChannels.delete(channel)
  if (currentChannels.size === 0) destroyClient(id)
}

function updateClientStates() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
    statistics: statistics()
  })
}