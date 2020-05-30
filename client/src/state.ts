import { on, ACTIONS } from './actions'
import { Diff } from 'deep-diff'

export type ID = string

export interface State {
  clients: ID[]
  lagStatistics: {[id: string]: number}
}
let current: State = {
  clients: [],
  lagStatistics: {}
}

function decompressKeys(diff: any): Diff<State, State> {
  const result: any = { kind: diff.k }
  if (diff.hasOwnProperty('p')) result.path = diff.p
  if (diff.hasOwnProperty('l')) result.lhs = diff.l
  if (diff.hasOwnProperty('r')) result.rhs = diff.r
  if (diff.hasOwnProperty('x')) result.index = diff.x
  if (diff.hasOwnProperty('i')) result.item = diff.i
  return result
}

on(ACTIONS.STATE_INIT, (newState: State) => current = newState)

on(ACTIONS.STATE_UPDATE, (diffs: Array<Diff<State, State>>) => {
  // @ts-ignore
  diffs.map(decompressKeys).map(diff => DeepDiff.applyChange(current, diff))
})

export function state<T extends State>(): T {
  return current as T
}
