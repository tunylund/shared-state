import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid'
import { act } from './actions';
import logger from './logger';
import { addPeer, destroyPeer, Peer, peer, updateLag } from './peers';
import { DeepPartial, MessageRequest, PingRequest, SharedStateServiceImplementation, Update } from "./shared-state";

interface EmittingPeer extends Peer {
  pendingEvents: Update[]
  emitter: EventEmitter
}

function emittingPeer(): EmittingPeer {
  const emitter = new EventEmitter()
  const pendingEvents: Update[] = []
  return {
    emitter,
    pendingEvents,
    send: (msg: Update) => {
      if (emitter.listenerCount('next') === 0) {
        pendingEvents.push(msg)
      } else {
        emitter.emit('next', msg)
      }
    }
  }
}

const peerToIdMap = new Map<string, string>()

export default function serviceFactory(onConnect: (id: string) => unknown): SharedStateServiceImplementation {
  return {

    async connect(_, { peer }) {
      const id = uuid()
      peerToIdMap.set(peer, id)
      addPeer(id, emittingPeer())
      onConnect(id)
      return { id }
    },
  
    async ping({ clientTime }: PingRequest, { peer }) {
      const id = peerToIdMap.get(peer)
      updateLag(id!, clientTime)
      return {}
    },
  
    async send({ action, attrs }: MessageRequest, { peer }) {
      const id = peerToIdMap.get(peer)
      logger.debug(id, `data-channel:`, action)
      act(id!, action, ...(JSON.parse(attrs) || []))
      return {}
    },
 
    async * listen(_, context): AsyncIterable<DeepPartial<Update>> {
      const id = peerToIdMap.get(context.peer)
      const p = (peer(id!) as EmittingPeer)
      while(true) {
        while (p.pendingEvents.length > 0) {
          yield p.pendingEvents.splice(0, 1)[0]
        }
        const action = await new Promise<Update>((resolve) => {
          p.emitter.on('next', msg => resolve(msg))
        })
        yield action
      }
    },
  
    async disconnect(_, context) {
      const id = peerToIdMap.get(context.peer)
      const p = peer(id!)
      if (id) {
        if (p) {
          const { emitter } = (p as EmittingPeer)
          emitter.removeAllListeners()
        }
        destroyPeer(id)
        peerToIdMap.delete(context.peer)
      }
      return {}
    }
  }  
}
