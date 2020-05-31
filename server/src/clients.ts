import { ID } from "./transport"
import logger from './logger'
import { act, ACTIONS, on, Action, off } from "./actions"
import { initState } from "./state"

interface Statistic {lag: number}

const channels = new Map<ID, Set<RTCDataChannel>>()
const stats = new Map<ID, Statistic>()

export function clients() {
  return Array.from(channels.keys())
}

export function statistics() {
  return Object.fromEntries(stats.entries())
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
  stats.delete(id)
  act(id, ACTIONS.CLOSE)
  off(id)
  updateClientStates()
}

export function send(id: ID, action: Action, ...attrs: any) {
  channels.get(id)?.forEach(channel => {
    if(channel.readyState === 'open') {
      logger.debug(id, 'send', action)
      try { channel.send(JSON.stringify({action, attrs})) }
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
  const stat = stats.get(id) || {lag: Infinity}
  stats.set(id, stat)
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