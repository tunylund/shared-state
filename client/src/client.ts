import logger from './logger'
import { on, ACTIONS, act } from './actions'

const channels = new Set<RTCDataChannel>()

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
on(ACTIONS.INIT, (id: ID) => {
  myId = id
})

export function addChannel(channel: RTCDataChannel, lagInterval: number) {
  channel.onopen = () => {
    logger.debug(`${myId}:`, 'open data-channel')
    for (let ch of channels) { ch.close() }
    channels.add(channel)
    act(ACTIONS.OPEN)
    on(ACTIONS.CLIENT_UPDATE, (newStats: ClientStatistics) => stats = newStats)
    startLagPingPong(lagInterval)
  }
  channel.onclose = () => {
    logger.debug(`${myId}:`, 'close data-channel')
    act(ACTIONS.CLOSE)
    channel.onerror = channel.onmessage = null
    channels.delete(channel)
    if (channels.size === 0) stopLagPingPong()
  }
  channel.onerror = (error: RTCErrorEvent) => {
    if (error.error?.message === 'Transport channel closed') return;
    logger.error(`${myId}:`, error)
    act(ACTIONS.ERROR, [error])
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    act(action, attrs)
  }
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
  channels.forEach(channel => {
    if(channel.readyState === 'open') {
      channel.send(JSON.stringify({action, attrs}))
    } else {
      logger.error(`${myId}: could not send to a ${channel.readyState} channel`, action)
    }
  })
}

export function clients() {
  return stats.clients
}

export function statistics(id: string) {
  return stats.statistics[id]
}
