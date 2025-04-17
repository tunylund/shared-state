const actions = new Map<Action, Set<Function>>()

export type Action = string

export enum ACTIONS {
  INIT = 'init',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PING = 'ping',
  STATE_INIT = 'state-init',
  STATE_UPDATE = 'state-update',
  CLIENT_UPDATE = 'client-update',
  CLIENT_METRICS_UPDATE = 'client-metrics-update',
  SUGGEST_ID = 'suggest-id',
  ACCEPT_ID = 'accept-id',
}

export function act(action: Action, ...args: any[]) {
  try {
    actions.get(action)?.forEach(fn => fn(...args))
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
