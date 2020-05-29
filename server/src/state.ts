import { broadcast, ID, send } from "./transport"
import { ACTIONS } from "./actions"
import deepDiff from 'deep-diff'
import rfdc from 'rfdc'

const deepClone = rfdc()

export interface State {
  clients: ID[]
  lagStatistics: {[id: string]: number}
}
let current: State = {
  clients: [],
  lagStatistics: {}
}
let clone = deepClone(current)

export function state<T extends State>(): T {
  return clone as T
}

export function init<T extends State>(state: Partial<T>) {
  const {clients, lagStatistics} = current
  current = deepClone({ clients, lagStatistics, ...state }) as T
  clone = deepClone(current)
  current.clients = []
  current.lagStatistics = {}
  broadcast(ACTIONS.STATE_INIT, current)
}

export function update<T extends State>(state: Partial<T>) {
  const {clients, lagStatistics} = current
  const newState = { clients, lagStatistics, ...state }
  const diffs = deepDiff.diff(current, newState)
  if (diffs && diffs.length > 0) {
    diffs.map(d => deepDiff.applyChange(current, newState, d))
    broadcast(ACTIONS.STATE_UPDATE, diffs)
    clone = deepClone(current)
  }
}

export function updateLag(id: ID, lag: number) {
  const cur = state()
  cur.lagStatistics[id] = lag
  update(cur)
}

export function addClient(id: ID) {
  const cur = state()
  cur.clients.push(id)
  cur.lagStatistics[id] = Infinity
  send(id, ACTIONS.STATE_INIT, cur)
  update(cur)
}

export function removeClient(id: ID) {
  const cur = state()
  cur.clients.splice(cur.clients.indexOf(id), 1)
  delete cur.lagStatistics[id]
  update(cur)
}
