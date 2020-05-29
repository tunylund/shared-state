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

on(ACTIONS.STATE_INIT, (newState: State) => {
  current = newState
})

on(ACTIONS.STATE_UPDATE, (diffs: Array<Diff<State, State>>) => {
  // @ts-ignore
  diffs && diffs.map(diff => DeepDiff.applyChange(current, diff))
})

export function state<T extends State>(): T {
  return current as T
}
