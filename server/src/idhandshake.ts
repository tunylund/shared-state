import { Socket } from "socket.io"
import { clients, ID, isClientOnHold } from "./clients.js"
import logger from "./logger.js"
import { EVENTS } from "./events.js"
import { v4 as uuid } from 'uuid'

function suggestId(socket: Socket, suggestedId: ID) {
  if(socket.connected) {
    logger.debug('negotiateClientId', 'suggesting id to the client', suggestedId, EVENTS.SUGGEST_ID)
    socket.emit(EVENTS.SUGGEST_ID, suggestedId)
  } else {
    logger.debug(`could not send to a disconnected channel`, EVENTS.SUGGEST_ID, suggestedId)
  }
}

export async function negotiateClientId(socket: Socket): Promise<ID> {
  return new Promise((resolve, reject) => {
    const initialId = uuid()

    socket.on(EVENTS.ACCEPT_ID, (acceptedId: ID) => {
      logger.debug('negotiateClientId', 'client accepted id', acceptedId)
      resolve(acceptedId)
    })

    socket.on(EVENTS.SUGGEST_ID, (suggestedId: ID) => {
      logger.debug('negotiateClientId', 'client suggested id', suggestedId)
      if (isClientOnHold(suggestedId) && !clients().includes(initialId)) {
        logger.debug('negotiateClientId', 'client suggested id is on hold, accepting the suggested id', suggestedId, 'for', initialId)
        suggestId(socket, suggestedId)
      } else {
        logger.debug('negotiateClientId', 'client suggested id is not available or already in use', suggestedId, 'Enforcing a new id.', initialId)
        resolve(initialId)
      }
    })
    // todo handle reject

    suggestId(socket, initialId)
  })
}
