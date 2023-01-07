import { v4 as uuid } from 'uuid'
import grpc from 'nice-grpc';
import { DeepPartial, MessageRequest, PingRequest, SharedStateServiceDefinition, SharedStateServiceImplementation, Update } from './shared-state';
import { addPeer, updateLag } from './peers';
import logger from './logger';
import { act } from './actions';
import { Duplex } from 'stream'

interface Config {

}

let server: grpc.Server

const peerIdMap = new Map<string, string>()
const idSendToClientMap = new Map<string, AsyncIterable<DeepPartial<Update>>>()

const serviceImpl: SharedStateServiceImplementation = {
  async connect(_, { peer }) {
    const id = uuid()
    peerIdMap.set(peer, id)
    const stream = new Duplex()
    idSendToClientMap.set(id, stream)
    const ting = { send: (msg: string) => { stream.write(msg); } }
    addPeer(id, ting)
    return { id }
  },
  async ping({ clientTime }: PingRequest, { peer }) {
    const id = peerIdMap.get(peer)
    updateLag(id!, clientTime)
    return {}
  },
  async send({ action, attrs }: MessageRequest, { peer }) {
    const id = peerIdMap.get(peer)
    logger.debug(id, `data-channel:`, action)
    act(id!, action, ...(JSON.parse(attrs) || []))
    return {}
  },
  async *listen(_, context): AsyncIterable<DeepPartial<Update>> {
    const id = peerIdMap.get(context.peer)
    const stream = idSendToClientMap.get(id!)
    return stream
  }
};

export async function start(port: number, initialState: {}, onConnect: (id: string) => any, config?: Partial<Config>) {
  server = grpc.createServer()
  server.add(SharedStateServiceDefinition, serviceImpl);
  await server.listen(`0.0.0.0:${port}`);
}

export async function stop() {
  await server.shutdown()
}