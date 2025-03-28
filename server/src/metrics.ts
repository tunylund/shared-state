import { ACTIONS } from "./actions.js"
import { broadcast, ID } from "./clients.js"

export interface ConnectionMetrics {
  lag: number,
  dataTransferRate: number
}
interface TransferRateCollector {
  amount: number,
  collectionStarted: number
}

const clientMetrics: {[id: string]: ConnectionMetrics} = {}
const transferRatesCollectors: {[key: string]: TransferRateCollector} = {}

export function getClientMetrics() {
  return clientMetrics
}

export function metrics(id: ID) {
  return clientMetrics[id]
}

export function deleteMetrics(id: ID) {
  delete clientMetrics[id]
  delete transferRatesCollectors[id]
}

export function collectTransferRate(id: ID, msg: string) {
  const collector = ensureTransferRateCollectorExistsForClient(id)
  collector.amount += msg.length
  if (Date.now() - collector.collectionStarted > 1000) {
    updateTransferRate(id, collector)
  }
}

function updateTransferRate(id: ID, collector: TransferRateCollector) {
  const metrics = ensureMetricsExistForClient(id)
  const timeCollected = Date.now() - collector.collectionStarted
  metrics.dataTransferRate = collector.amount / timeCollected
  collector.amount = 0
  collector.collectionStarted = Date.now()
  broadcastClientsUpdate()
}

export function updateLag(id: ID, lag: number) {
  const metrics = ensureMetricsExistForClient(id)
  metrics.lag = lag
  broadcastClientsUpdate()
}

function ensureTransferRateCollectorExistsForClient(id: ID): TransferRateCollector {
  return transferRatesCollectors[id] = transferRatesCollectors[id] || { amount: 0, collectionStarted: Date.now() }
}

function ensureMetricsExistForClient(id: ID): ConnectionMetrics {
  return clientMetrics[id] = clientMetrics[id] || {lag: Infinity, dataTransferRate: 0}
}

function broadcastClientsUpdate() {
  broadcast(ACTIONS.CLIENT_METRICS_UPDATE, getClientMetrics())
}
