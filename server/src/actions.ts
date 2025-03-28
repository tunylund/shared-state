import { EventEmitter } from 'node:events';
import { ID } from './clients.js'

const eventEmittersForEachClient = new Map<ID, EventEmitter>()

export type Action = string
export enum ACTIONS {
  INIT = 'init',
  CONNECTED = 'connected',
  CLOSE = 'close',
  ERROR = 'error',
  PING = 'ping',
  STATE_INIT = 'state-init',
  STATE_UPDATE = 'state-update',
  CLIENT_UPDATE = 'client-update',
  CLIENT_METRICS_UPDATE = 'client-metrics-update',
}

export function act(id: ID, action: Action, ...attrs: any[]) {
  eventEmittersForEachClient.get(id)?.emit(action, ...attrs)
}

export function on(id: ID, action: Action, fn: (...args: any[]) => void) {
  const emitter = eventEmittersForEachClient.get(id) || new EventEmitter()
  eventEmittersForEachClient.set(id, emitter)
  emitter.on(action, fn)
}

export function off(id: ID, action?: Action, fn?: (...args: any[]) => void) {
  const emitter = eventEmittersForEachClient.get(id)
  if (action && fn) emitter?.removeListener(action, fn)
  else {
    emitter?.removeAllListeners(action)
    if (emitter?.eventNames.length === 0) eventEmittersForEachClient.delete(id)
  }
}
