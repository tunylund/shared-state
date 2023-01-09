import { act, Action, ACTIONS, on } from "./actions"
import logger from "./logger"
import { initState } from "./state"

const peers = new Map<string, Peer>()
const stats = new Map<string, Statistic>()
const rates = new Map<string, TransferRate>()


export interface Peer {
  send: (msg: { action: string, attrs: string }) => unknown
}

interface Statistic {
  lag: number
  dataTransferRate: number
}

interface TransferRate {
  amount: 0
  collectionStarted: number
}

export function addPeer(id: string, peer: Peer) {
  if (peers.has(id)) throw new Error(`peer '${id}' is already listed`)
  peers.set(id, peer)
  ensureStatsExist(id)
  initState(id)
  act(id, ACTIONS.OPEN)
  updateClientStates()
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

export function destroyPeer(id: string) {
  peers.delete(id)
  stats.delete(id)
  rates.delete(id)
  act(id, ACTIONS.CLOSE)
  updateClientStates()
}

export function peer(id: string): Peer|undefined {
  return peers.get(id)
}

export function peerIds() {
  return Array.from(peers.keys())
}

export function send(id: string, action: Action, ...attrs: any[]) {
  const peer = peers.get(id)
  const msg = { action, attrs: JSON.stringify(attrs) }
  if (peer) {
    collectTransferRate(id, JSON.stringify(msg))
    logger.debug(id, 'send', action)
    try { peer.send(msg) }
    catch (err) {
      logger.error(id, `could not send to a peer`, action)
      logger.error(err)
    }
  }
}

export function broadcast(action: Action, ...attrs: any) {
  for (let id of peers.keys()) {
    send(id, action, ...attrs)
  }
}

export function broadcastToOthers(notThisId: string, action: Action, ...attrs: any) {
  for (let id of peers.keys()) {
    if (id !== notThisId) send(id, action, ...attrs)
  }
}

export function statistics(id: string) {
  return stats.get(id)
}

function collectTransferRate(id: string, msg: string) {
  const collector = rates.get(id) ?? { amount: 0, collectionStarted: Date.now() }
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

function ensureStatsExist(id: string): Statistic {
  const stat = stats.get(id) || {lag: Infinity, dataTransferRate: 0}
  stats.set(id, stat)
  return stat
}

function updateClientStates() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    peers: peerIds(),
    statistics: Object.fromEntries(stats)
  })
}

export function updateLag(id: string, clientTime: number) {
  const stat = ensureStatsExist(id)
  stat.lag = Date.now() - clientTime
  updateClientStates()
}