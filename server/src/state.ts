import { broadcast, ID, send } from "./transport"
import { ACTIONS } from "./actions"
import deepDiff, { Diff } from 'deep-diff'
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

interface CompressedDiff {
  k?: any
  p?: any
  l?: any
  r?: any
  i?: any
  x?: any
}

function diffToCompressedDiff(diff: any): CompressedDiff {
  const small: CompressedDiff = { k: diff.kind }
  if (diff.hasOwnProperty('path')) small.p = diff.path
  if (diff.hasOwnProperty('lhs')) small.l = diff.lhs
  if (diff.hasOwnProperty('rhs')) small.r = diff.rhs
  if (diff.hasOwnProperty('index')) small.x = diff.index
  if (diff.hasOwnProperty('item')) small.i = diff.item
  return small
}

export function update<T extends State>(state: Partial<T>) {
  const {clients, lagStatistics} = current
  const newState = { clients, lagStatistics, ...state }
  const diffs = deepDiff.diff(current, newState)
  if (diffs && diffs.length > 0) {
    diffs.map(d => deepDiff.applyChange(current, newState, d))
    broadcast(ACTIONS.STATE_UPDATE, diffs.map(diffToCompressedDiff))
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
