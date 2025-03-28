import logger from './logger.js'
import { act, ACTIONS, on, Action, off } from "./actions.js"
import { state } from "./state.js"
import { Socket } from "socket.io"
import { v4 as uuid } from 'uuid'
import { collectTransferRate, deleteMetrics, getClientMetrics, updateLag } from './metrics.js'


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
    removeClientSocket(id, socket)
  })
  socket.on("message", (msg: string) => {
    const {action, attrs} = JSON.parse(msg.toString())
    logger.debug(id, 'message', action)
    act(id, action, ...(attrs || []))
  })

  return id
}

export function destroyClient(id: ID) {
  clientSockets.get(id)?.disconnect(true)
  clientSockets.get(id)?.removeAllListeners()
  clientSockets.delete(id)
  deleteMetrics(id)
  act(id, ACTIONS.CLOSE)
  off(id)
  broadcastClientsUpdate()
}

function addClientSocket(id: ID, socket: Socket) {
  clientSockets.set(id, socket)
  send(id, ACTIONS.INIT, id, state())
  broadcastClientsUpdate()
  act(id, ACTIONS.CONNECTED)
  on(id, ACTIONS.PING, (theirTime: number) => updateLag(id, Date.now() - theirTime))
}

function removeClientSocket(id: ID, socket: Socket) {
  if (clientSockets.get(id) === socket) {
    clientSockets.delete(id)
  }
}

export function send(id: ID, action: Action, ...attrs: any) {
  const channel = clientSockets.get(id)
  if(channel && channel.connected) {
    const msg = JSON.stringify({action, attrs})
    collectTransferRate(id, msg)
    logger.debug(id, 'send', action)
    try { channel.emit("message", msg) }
    catch (err) { logger.error(id, `could not send to a '${id}' channel`, action) }
  } else {
    logger.debug(id, `could not send to a '${id}' channel`, action)
  }
}
  
export function broadcast(action: Action, ...attrs: any) {
  for (let id of clientSockets.keys()) {
    send(id, action, ...attrs)
  }
}

export function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any) {
  for (let id of clientSockets.keys()) {
    if (id !== notThisId) send(id, action, ...attrs)
  }
}

function broadcastClientsUpdate() {
  broadcast(ACTIONS.CLIENT_UPDATE, {
    clients: clients(),
  })
}
