import { act, ACTIONS, on } from './actions'
import logger, { setLogLevel } from './logger'
import grpc from 'nice-grpc-web'
import { SharedStateServiceClient, SharedStateServiceDefinition } from './shared-state'

interface Config {
  lagInterval: number
  debugLog: boolean
}
const defaultConfig: Config = {
  lagInterval: 3000,
  debugLog: false
}

interface ClientStatistics {
  clients: string[]
  statistics: { [id: string]: Statistic }
}
export interface Statistic {
  lag: number
  dataTransferRate: number
}
let stats: ClientStatistics = {
  clients: [],
  statistics: {}
}

let client: SharedStateServiceClient
export async function connect(url: string, config?: Partial<Config>) {
  const conf = { ...defaultConfig, ...config }
  setLogLevel(conf.debugLog)

  const channel = grpc.createChannel(url);
  
  client = grpc.createClient(
    SharedStateServiceDefinition,
    channel,
  )

  logger.debug('connecting')

  const id = await client.connect({})
  act(ACTIONS.OPEN)
  on(ACTIONS.CLIENT_UPDATE, (newStats: ClientStatistics) => stats = newStats)
  on(ACTIONS.CLOSE, stopLagPingPong)

  startLagPingPong(conf.lagInterval)
  startListeningForUpdates()

  act(ACTIONS.INIT, [id])
}

let lagPingTimeout: any
function startLagPingPong(lagInterval: number) {
  function ping() {
    client.ping({ clientTime: Date.now() })
    lagPingTimeout = setTimeout(ping, lagInterval)
  }
  ping()
}
function stopLagPingPong() {
  clearTimeout(lagPingTimeout)
  lagPingTimeout = null
}

async function startListeningForUpdates() {
  for await (const {action, attrs} of client.listen({})) {
    act(action, JSON.parse(attrs))
  }
}

export function send(action: string, ...attrs: any[]) {
  try {
    client.send({action, attrs: JSON.stringify(attrs)})
  } catch (error) {
    logger.error(`could not send ${action}|${attrs}:`, error)
    act(ACTIONS.ERROR, [error])
  }
}

export function clients() {
  return stats.clients
}

export function statistics(id: string) {
  return stats.statistics[id]
}
