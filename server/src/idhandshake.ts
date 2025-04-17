import { Socket } from "socket.io"
import { clients, ID, isClientOnHold } from "./clients.js"
import logger from "./logger.js"
import { ACTIONS } from "./actions.js"
import { v4 as uuid } from 'uuid'

function suggestId(socket: Socket, suggestedId: ID) {
  if(socket.connected) {
    logger.debug('negotiateClientId', suggestedId, ACTIONS.SUGGEST_ID)
    socket.emit(ACTIONS.SUGGEST_ID, suggestedId)
  } else {
    logger.debug(`could not send to a disconnected channel`, ACTIONS.SUGGEST_ID, suggestedId)
  }
}

export async function negotiateClientId(socket: Socket): Promise<ID> {
  return new Promise((resolve, reject) => {
    const initialId = uuid()

    socket.on(ACTIONS.ACCEPT_ID, (acceptedId: ID) => {
      logger.debug('negotiateClientId', 'client accepted id', acceptedId)
      resolve(acceptedId)
    })

    socket.on(ACTIONS.SUGGEST_ID, (suggestedId: ID) => {
      logger.debug('negotiateClientId', 'client suggested id', suggestedId)
      if (isClientOnHold(suggestedId) && !clients().includes(initialId)) {
        logger.debug('negotiateClientId', 'client suggested id is on hold, accepting the suggested id', suggestedId, 'for', initialId)
        suggestId(socket, suggestedId)
      } else {
        // TODO: handle the case where the suggested id is not on hold
      }
    })
    // todo handle reject

    suggestId(socket, initialId)
  })
}
