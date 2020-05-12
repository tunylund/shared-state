import { on } from "./actions"

export enum GAMESTATE {
  INIT = 'gamestate-init',
  UPDATE = 'gamestate-update'
}

export type ID = string

export interface State {
  clients: ID[]
  [key: string]: any
}
let current: State = { clients: [] }

on(GAMESTATE.INIT, (newState: State) => {
  current = newState
})

on(GAMESTATE.UPDATE, (newState: State) => {
  current = newState
})

export function state<T extends State>(): T {
  return current as T
}
