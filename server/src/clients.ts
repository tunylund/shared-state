import logger from './logger.js'
import { trigger, EVENTS } from "./events.js"
import { state } from "./state.js"
import { Socket } from "socket.io"
import { collectTransferRate, deleteMetrics } from './metrics.js'
import { negotiateClientId } from './idhandshake.js'


export type ID = string

const clientSockets = new Map<ID, Socket>()
const clientsOnHold = new Set<ID>()

export function clients() {
  return Array.from(clientSockets.keys())
}

export async function connectClient(socket: Socket): Promise<ID> {
  const id = await negotiateClientId(socket)
  releaseClientFromHold(id)
  setupClientSocket(id, socket)
  send(id, EVENTS.INIT, id, state())
  broadcastClientsUpdate()
  trigger(EVENTS.CONNECTED, id)
  return id
}

export function isClientOnHold(id: ID) {
  return clientsOnHold.has(id)
}

function holdClient(id: ID) {
  const socket = clientSockets.get(id)
  if (socket) clientsOnHold.add(id)
}

function releaseClientFromHold(id: ID) {
  clientsOnHold.delete(id)
}

export function destroyClient(id: ID) {
  trigger(EVENTS.DISCONNECTED, id)
  destroySocket(id)
  deleteMetrics(id)
  broadcastClientsUpdate()
}

function destroySocket(id: ID) {
  clientSockets.get(id)?.disconnect(true)
  clientSockets.get(id)?.removeAllListeners()
  clientSockets.delete(id)
}

function setupClientSocket(id: ID, socket: Socket) {
  socket.on("disconnect", (reason) => {
    logger.debug('disconnect', id, reason)

    if (['server namespace disconnect',
         'client namespace disconnect',
         'server shutting down',
         'forced server close'].includes(reason)) {
      destroyClient(id)
    } else {
      holdClient(id)
    }
  })

  socket.on("message", (msg: string) => {
    const {action, args} = JSON.parse(msg.toString())
    logger.debug('message', id, action)
    trigger(action, id, ...(args || []))
  })

  clientSockets.set(id, socket)
}

export function send(id: ID, action: string, ...args: any[]) {
  const socket = clientSockets.get(id)
  if(socket && socket.connected) {
    const msg = JSON.stringify({action, args})
    collectTransferRate(id, msg)
    logger.debug('send', id, action)
    try { socket.emit("message", msg) }
    catch (err) { logger.error(id, `could not send to a '${id}' channel`, action) }
  } else {
    logger.debug(`could not send to a disconnected channel`, action, id)
  }
}
  
export function broadcast(action: string, ...args: any[]) {
  for (let id of clientSockets.keys()) {
    send(id, action, ...args)
  }
}

export function broadcastToOthers(notThisId: ID, action: string, ...args: any[]) {
  for (let id of clientSockets.keys()) {
    if (id !== notThisId) send(id, action, ...args)
  }
}

function broadcastClientsUpdate() {
  broadcast(EVENTS.CLIENT_UPDATE, {
    clients: clients(),
  })
}
