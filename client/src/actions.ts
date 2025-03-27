
const actions = new Map<Action, Set<Function>>()

export type Action = string

export enum ACTIONS {
  INIT = 'init',
  CONNECTED = 'connected',
  CLOSE = 'close',
  ERROR = 'error',
  PING = 'ping',
  STATE_INIT = 'state-init',
  STATE_UPDATE = 'state-update',
  CLIENT_UPDATE = 'client-update'
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