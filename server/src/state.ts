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
  current = deepClone({ ...state }) as T
  current.clients = []
  current.lagStatistics = {}
  clone = deepClone(current)
  broadcast(ACTIONS.STATE_INIT, current)
}

function compressKeys(diff: any): any {
  const result: any = { k: diff.kind }
  if (diff.hasOwnProperty('path')) result.p = diff.path
  if (diff.hasOwnProperty('lhs')) result.l = diff.lhs
  if (diff.hasOwnProperty('rhs')) result.r = diff.rhs
  if (diff.hasOwnProperty('index')) result.x = diff.index
  if (diff.hasOwnProperty('item')) result.i = diff.item
  return result
}

export function update<T extends State>(state: T) {
  const {clients, lagStatistics} = current
  const newState = { clients, lagStatistics, ...state }
  const diffs = deepDiff.diff(current, newState)
  if (diffs && diffs.length > 0) {
    diffs.map(d => deepDiff.applyChange(current, newState, d))
    broadcast(ACTIONS.STATE_UPDATE, diffs.map(compressKeys))
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
