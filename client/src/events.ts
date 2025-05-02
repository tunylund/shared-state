const eventListeners = new Map<string, Set<Function>>()

export enum EVENTS {
  // public events, usually users should connect to these events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',

  // events for id negotiation
  SUGGEST_ID = 'suggest-id',
  ACCEPT_ID = 'accept-id',
  INIT = 'init',

  // internal events
  PING = 'ping',
  STATE_INIT = 'state-init',
  STATE_UPDATE = 'state-update',
  CLIENT_UPDATE = 'client-update',
  CLIENT_METRICS_UPDATE = 'client-metrics-update',
}

export function trigger(event: string, ...args: any[]) {
  try {
    eventListeners.get(event)?.forEach(fn => fn(...args))
  } catch (err) {
    console.error(err)
  }
}

export function on(action: string, fn: Function) {
  if (!eventListeners.has(action)) eventListeners.set(action, new Set())
  eventListeners.get(action)?.add(fn)
}

export function once(action: string, fn: Function) {
  const listener = (...args: any[]) => {
    fn(...args)
    off(action, listener)
  }
  on(action, listener)
}

export function off(action: string, fn:Function|null = null) {
  if (fn) eventListeners.get(action)?.delete(fn)
  else eventListeners.delete(action)
}
