import { ID } from './transport'
export type Action = string

const actions = new Map<ID, Map<Action, Set<Function>>>()
const emptySet = new Set<any>()

export const OPEN = 'open'
export const CLOSE = 'open'
export const ERROR = 'open'

export function act(id: ID, action: Action, ...attrs: any[]) {
  for (let fn of actions.get(id)?.get(action) || emptySet) {
    try {
      fn(...attrs)
    } catch (err) {
      console.error(id, err)
    }
  }
}

export function on(id: ID, action: Action, fn: Function) {
  const accs = actions.get(id) || new Map<Action, Set<Function>>()
  const fns = accs.get(action) || new Set()
  actions.set(id, accs)
  accs.set(action, fns)
  fns.add(fn)
}

export function off(id: ID, action?: Action, fn?: Function) {
  if (action && fn) actions.get(id)?.get(action)?.delete(fn)
  else if (action) actions.get(id)?.delete(action)
  else actions.delete(id)
}
