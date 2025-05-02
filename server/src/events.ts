import { EventEmitter } from 'node:events';
import { ID } from './clients.js'

const emitter = new EventEmitter()

export enum EVENTS {
  // public events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',

  // client id negotiation events
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

export function trigger(event: string, id: ID, ...args: any[]) {
  emitter.emit(event, id, ...args)
}

export function on(event: string, fn: (...args: any[]) => void) {
  emitter.on(event, fn)
}

export function off(event: string, fn?: (...args: any[]) => void) {
  if (event && fn) emitter.removeListener(event, fn)
  else {
    emitter.removeAllListeners(event)
  }
}
