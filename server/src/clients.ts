import logger from './logger.js'
import { act, ACTIONS, on, Action } from "./actions.js"
import { state } from "./state.js"
import { Socket } from "socket.io"
import { v4 as uuid } from 'uuid'
import { collectTransferRate, deleteMetrics, updateLag } from './metrics.js'


export type ID = string

const clientSockets = new Map<ID, Socket>()

export function clients() {
  return Array.from(clientSockets.keys())
}

export function createClient(socket: Socket): ID {
  const id = uuid()

  addClientSocket(id, socket)

  socket.on("disconnect", (reason, details) => {
    logger.debug(id, 'disconnect', reason, details)
    destroyClient(id)
  })
  socket.on("message", (msg: string) => {
    const {action, args} = JSON.parse(msg.toString())
    logger.debug(id, 'message', action)
    act(action, id, ...(args || []))
  })

  return id
}

export function destroyClient(id: ID) {
  act(ACTIONS.DISCONNECTED, id)
  clientSockets.get(id)?.disconnect(true)
  clientSockets.get(id)?.removeAllListeners()
  clientSockets.delete(id)
  deleteMetrics(id)
  broadcastClientsUpdate()
}

function addClientSocket(id: ID, socket: Socket) {
  clientSockets.set(id, socket)
  send(id, ACTIONS.INIT, id, state())
  broadcastClientsUpdate()
  act(ACTIONS.CONNECTED, id)
}

export function send(id: ID, action: Action, ...args: any[]) {
  const channel = clientSockets.get(id)
  if(channel && channel.connected) {
    const msg = JSON.stringify({action, args})
    collectTransferRate(id, msg)
    logger.debug(id, 'send', action)
    try { channel.emit("message", msg) }
    catch (err) { logger.error(id, `could not send to a '${id}' channel`, action) }
  } else {
    logger.debug(id, `could not send to a '${id}' channel`, action)
  }
}
  
export function broadcast(action: Action, ...args: any[]) {
  for (let id of clientSockets.keys()) {
    send(id, action, ...args)
  }
}

export function broadcastToOthers(notThisId: ID, action: Action, ...args: any[]) {
  for (let id of clientSockets.keys()) {
    if (id !== notThisId) send(id, action, ...args)
  }
}

function broadcastClientsUpdate() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
  })
}
