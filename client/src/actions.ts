
const actions = new Map<Action, Set<Function>>()

type Action = string

export enum ACTIONS {
  INIT = 'init',
  OPEN = "open",
  CLOSE = "close",
  ERROR = "error"
}

export function act(action: Action, attrs: any[] = []) {
  try {
    actions.get(action)?.forEach(fn => fn(...attrs))
  } catch (err) {
    console.error(err)
  }
}

export function on(ev: Action, fn: Function) {
  if (!actions.has(ev)) actions.set(ev, new Set())
  actions.get(ev)?.add(fn)
}

export function off(ev: Action, fn:Function|null = null) {
  if (fn) actions.get(ev)?.delete(fn)
  else actions.delete(ev)
}