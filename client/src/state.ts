import { on, ACTIONS } from "./actions"

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

on(ACTIONS.STATE_UPDATE, (newState: State) => {
  current = newState
})

export function state<T extends State>(): T {
  return current as T
}
