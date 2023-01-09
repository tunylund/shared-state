import { act, ACTIONS, on } from './actions'
import logger, { setLogLevel } from './logger'
import grpc, { waitForChannelReady } from 'nice-grpc'
import { SharedStateServiceClient, SharedStateServiceDefinition } from './shared-state'
import ggrpc from '@grpc/grpc-js'

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
export async function connect(url: string, config?: Partial<Config>): Promise<() => void> {
  const conf = { ...defaultConfig, ...config }
  setLogLevel(conf.debugLog)

  const channel = grpc.createChannel(url);
  await waitForChannelReady(channel, new Date(Date.now() + 1000))
  
  client = grpc.createClient(
    SharedStateServiceDefinition,
    channel,
  )

  const { id } = await client.connect({})
  on(ACTIONS.CLIENT_UPDATE, (newStats: ClientStatistics) => stats = newStats)
  on(ACTIONS.CLOSE, stopLagPingPong)
  await startLagPingPong(conf.lagInterval)
  const abortController = new AbortController();
  startListeningForUpdates(abortController.signal)
  act(ACTIONS.INIT, [id])

  return async () => {
    abortController.abort()
    stopLagPingPong()
    if (channel.getConnectivityState(false) == ggrpc.connectivityState.READY) {
      await client.disconnect({})
      channel.close()
    }
  }
}

let lagPingTimeout: any
async function startLagPingPong(lagInterval: number) {
  async function ping() {
    await client.ping({ clientTime: Date.now() })
    lagPingTimeout = setTimeout(ping, lagInterval)
  }
  await ping()
}
function stopLagPingPong() {
  clearTimeout(lagPingTimeout)
  lagPingTimeout = null
}

async function startListeningForUpdates(signal: AbortSignal) {
  try {
    for await (const response of client.listen({}, { signal })) {
      act(response.action, JSON.parse(response.attrs))
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') logger.log('aborted')
    else logger.error(error)
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
