import { broadcast, ID, send } from "./transport"
import { ACTIONS } from "./actions"

export interface State {
  clients: ID[]
  lagStatistics: {[id: string]: number}
}
let current: State = {
  clients: [],
  lagStatistics: {}
}

export function state<T extends State>(): T {
  return current as T
}

export function init<T extends State>(state: Partial<T>) {
  current = JSON.parse(JSON.stringify(state))
  current.clients = []
  current.lagStatistics = {}
  broadcast(ACTIONS.STATE_INIT, current)
}

export function update<T extends State>(state: Partial<T>) {
  const {clients, lagStatistics} = current
  current = Object.assign(state, {clients, lagStatistics})
  broadcast(ACTIONS.STATE_UPDATE, current)
}

export function updateLag(id: ID, lag: number) {
  current.lagStatistics[id] = lag
  send(id, ACTIONS.STATE_UPDATE, current)
}

export function addClient(id: ID) {
  current.clients.push(id)
  current.lagStatistics[id] = Infinity
  send(id, ACTIONS.STATE_INIT, current)
  update(current)
}

export function removeClient(id: ID) {
  current.clients.splice(current.clients.indexOf(id), 1)
  delete current.lagStatistics[id]
  update(current)
}
