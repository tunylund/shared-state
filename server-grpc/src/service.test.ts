import { CallContext } from 'nice-grpc'
import { Duplex, EventEmitter, Stream } from 'stream'
import { ACTIONS, off, on } from './actions'
import { peer, peerIds, send, statistics } from './peers'
import serviceFactory from './service'

jest.useFakeTimers();
describe('service', () => {

  const context = { peer: 'some-peer' } as CallContext
  const onConnect = jest.fn()
  const service = serviceFactory(onConnect)
  let id: string

  beforeEach(async () => {
    id = (await service.connect({}, context))?.id ?? ''
  })

  afterEach(async () => {
    await service.disconnect({}, context)
    off(id)
  })

  describe('connect', () => {
    it('should respond with a unique id', async () => {
      expect(id).toHaveLength(36)
    })
    it('should remember the client', async () => {
      expect(peerIds()).toHaveLength(1)
    })
    it('should setup an emitter for the client to listen to', async () => {
      expect(peer(id!)).toHaveProperty('emitter')
    })
    it('should notify the server that there is a new client', async () => {
      expect(onConnect).toHaveBeenCalledWith(id)
    })
  })

  describe('disconnect', () => {
    it('should remove the client based on peer in the context', async () => {
      await service.disconnect({}, context)
      expect(peerIds()).toHaveLength(0)
    })

    it('should end any streams opened for the client', async () => {
      const { emitter } = peer(id!) as any as { emitter: EventEmitter }
      await service.disconnect({}, context)
      expect(emitter.listenerCount("next")).toBe(0)
    })
  })

  describe('ping', () => {
    it('should update lag statistics of the client', async () => {
      const clientTime = Date.now()
      jest.advanceTimersByTime(1000)
      await service.ping({ clientTime }, context)
      expect(statistics(id!)).toMatchObject({dataTransferRate: 0, lag: 1000})
    })
  })

  describe("send", () => {
    it("should trigger an action based on the message", async () => {
      const cb = jest.fn()
      on(id, "foo", cb)
      await service.send({ action: "foo", attrs: JSON.stringify(["bar"]) }, context)
      expect(cb).toHaveBeenCalledWith("bar")
    })
  })

  describe("listen", () => {
    it("should return an async iterable that gets published any pending messages for the client", async () => {
      const iterable = service.listen({}, context)
      const iterator = iterable[Symbol.asyncIterator]()
      expect(await iterator.next()).toMatchObject({
        value: { action: ACTIONS.STATE_INIT, attrs: JSON.stringify([{}]) },
        done: false
      })
    })

    it("should return an async iterable that gets published any new messages for the client", async () => {
      const iterable = service.listen({}, context)
      const iterator = iterable[Symbol.asyncIterator]()
      await iterator.next() // state-init
      await iterator.next() // client-update
      const promise = iterator.next()
      send(id, 'test', "value")
      const iteration = await promise
      expect(iteration).toMatchObject({
        value: { action: "test", attrs: JSON.stringify(["value"]) },
        done: false
      })
    })
  })
})