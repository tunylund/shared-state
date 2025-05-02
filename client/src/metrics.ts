import { ID, send } from "./client.js"
import { EVENTS, on } from "./events.js"

let clientMetrics: { [id: ID]: ConnectionMetrics } = {}
let lagPingTimeout: any

on(EVENTS.CLIENT_METRICS_UPDATE, (newClientMetrics: { [id: string]: ConnectionMetrics }) => {
  clientMetrics = newClientMetrics
})

export interface ConnectionMetrics {
  lag: number,
  dataTransferRate: number
}

export function startLagPingPong(lagInterval: number) {
  function ping() {
    send(EVENTS.PING, Date.now())
    lagPingTimeout = setTimeout(ping, lagInterval)
  }
  ping()
}

export function stopLagPingPong() {
  clearTimeout(lagPingTimeout)
  lagPingTimeout = null
}

export function metrics(id: ID) {
  return clientMetrics[id]
}
