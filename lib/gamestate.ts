import { broadcast } from "./transport"
import { diff, applyChange } from 'deep-diff'

export enum GAMESTATE {
  INIT = 'gamestate-init',
  UPDATE = 'gamestate-update'
}

let current = {}
export function init(state = {}) {
  current = JSON.parse(JSON.stringify(state))
  broadcast(GAMESTATE.INIT, current)
}

export function update(state = {}) {
  const target = {}
  diff(current, state)?.map(d => applyChange(target, state, d))
  broadcast(GAMESTATE.UPDATE, target)
}
