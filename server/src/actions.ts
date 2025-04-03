import { EventEmitter } from 'node:events';
import { ID } from './clients.js'

const emitter = new EventEmitter()

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
}

export function act(action: Action, id: ID, ...args: any[]) {
  emitter.emit(action, id, ...args)
}

export function on(action: Action, fn: (...args: any[]) => void) {
  emitter.on(action, fn)
}

export function off(action: Action, fn?: (...args: any[]) => void) {
  if (action && fn) emitter.removeListener(action, fn)
  else {
    emitter.removeAllListeners(action)
  }
}
