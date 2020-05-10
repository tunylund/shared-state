import { broadcast, ID, send } from "./transport"
import { diff, applyChange } from 'deep-diff'

export enum GAMESTATE {
  INIT = 'gamestate-init',
  UPDATE = 'gamestate-update'
}

interface GameState {
  clients: ID[]
  [key: string]: any
}
let current: GameState = { clients: [] }

export function state(): GameState {
  return current
}

export function init(state: GameState) {
  current = JSON.parse(JSON.stringify(Object.assign({ clients: [] }, state)))
  broadcast(GAMESTATE.INIT, current)
}

export function update(state: GameState) {
  const target: any = {}
  diff(current, state)?.map(d => {
    applyChange(current, state, d)
    applyChange(target, state, d)
  })
  broadcast(GAMESTATE.UPDATE, target)
}

export function addClient(id: ID) {
  const newState = {...current, clients: [id, ...current.clients]}
  send(id, GAMESTATE.INIT, newState)
  update(newState)
}

export function removeClient(id: ID) {
  const newState = {...current, clients: current.clients.filter(_id => _id !== id)}
  update(newState)
}
