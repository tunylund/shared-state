import { on, ACTIONS } from "./actions"
import { Diff } from "deep-diff"

export type ID = string

export interface State {
  clients: ID[]
  lagStatistics: {[id: string]: number}
}
let current: State = {
  clients: [],
  lagStatistics: {}
}

function compressedDiffToDiff(compressedDiff: any): Diff<State, State> {
  const diff: any = { kind: compressedDiff.k }
  if (compressedDiff.hasOwnProperty('p')) diff.path = compressedDiff.p
  if (compressedDiff.hasOwnProperty('l')) diff.lhs = compressedDiff.l
  if (compressedDiff.hasOwnProperty('r')) diff.rhs = compressedDiff.r
  if (compressedDiff.hasOwnProperty('x')) diff.index = compressedDiff.x
  if (compressedDiff.hasOwnProperty('i')) diff.item = compressedDiff.i
  return diff
}

on(ACTIONS.STATE_INIT, (newState: State) => {
  current = newState
})

on(ACTIONS.STATE_UPDATE, (diffs: Array<Diff<State, State>>) => {
  // @ts-ignore
  diffs.map(compressedDiffToDiff).map(diff => DeepDiff.applyChange(current, diff))
})

export function state<T extends State>(): T {
  return current as T
}
