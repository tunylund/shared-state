import { createClient, clients, destroyClient, send, broadcast, broadcastToOthers, statistics } from "./clients"
import { on, ACTIONS, off } from "./actions"
import { state } from "./state"
jest.mock('./logger')

describe('clients', () => {

  function mockChannel() {
    const mock = {
      close: jest.fn(() => mock.onclose && mock.onclose({} as Event)),
      readyState: 'open',
      send: jest.fn(),
    } as any as RTCDataChannel
    return mock
  }
  function openTestChannel(id: string, client: RTCDataChannel) {
    createClient(id, client)
    if (client.onopen) client.onopen({} as Event)
  }
  function msg(action: string, attr: any) {
    return JSON.stringify({action, attrs: [attr]})
  }
  const a = mockChannel()
  const b = mockChannel()
  const aopened = jest.fn()
  const aclosed = jest.fn()

  beforeEach(() => {
    on('a-id', ACTIONS.OPEN, aopened)
    on('a-id', ACTIONS.CLOSE, aclosed)
    openTestChannel('a-id', a)
  })
  afterEach(() => {
    off('a-id')
    destroyClient('a-id')
    destroyClient('b-id')
  })

  describe('interface', () => {
    it('should keep track of clients', () => {
      expect(clients()).toEqual(['a-id'])
    })
  
    it('should destroy the client', () => {
      destroyClient('a-id')
      expect(aclosed).toHaveBeenCalled()
      expect(clients()).toEqual([])
    })
  
    it('should send a message to a client', () => {
      send('a-id', 'some-action', 'some-value')
      expect(a.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  
    it('should broadcast a message to all clients', () => {
      openTestChannel('b-id', b)
      broadcast('some-action', 'some-value')
      expect(a.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(b.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  
    it('should broadcast to other clients', () => {
      openTestChannel('b-id', b)
      broadcastToOthers('a-id', 'some-action', 'some-value')
      expect(a.send).not.toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(b.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
    
    it('should provide statistics', () => {
      expect(statistics()).toMatchObject(new Map([['a-id', { lag: Infinity, dataTransferRate: 0 }]]))
    })
  })

  describe('channel behaviour', () => {
    it('should initialize state when channel is open', () => {
      expect(aopened).toHaveBeenCalled()
      expect(a.send).toHaveBeenCalledWith(msg(ACTIONS.STATE_INIT, state()))
    })

    it('should destroy the client if all channels close', () => {
      if (a.onclose) a.onclose({} as Event)
      expect(aclosed).toHaveBeenCalled()
      expect(clients()).toEqual([])
    })

    it('should close previous channels when a new channel is created', () => {
      openTestChannel('a-id', b)
      expect(a.close).toHaveBeenCalled()
    })

    it('should not close the client when a new channel is added', () => {
      openTestChannel('a-id', b)
      expect(aclosed).not.toHaveBeenCalled()
      expect(clients()).toEqual(['a-id'])
    })

    it('should keep track of lag', () => {
      const data = msg(ACTIONS.PING, Date.now())
      if (a.onmessage) a.onmessage({data} as MessageEvent)
      expect(statistics()['a-id'].lag).toBeLessThan(10)
    })

    it('should broadcast client states when a new client is added', () => {
      openTestChannel('b-id', b)
      const data = msg(ACTIONS.CLIENT_UPDATE, { clients: ['a-id', 'b-id'], statistics: { 'a-id': { lag: Infinity, dataTransferRate: 0 }, 'b-id': { lag: Infinity, dataTransferRate: 0 } } })
      expect(a.send).toHaveBeenLastCalledWith(data)
      expect(b.send).toHaveBeenLastCalledWith(data)
    })

    it('should broadcast client states when a client is destroyed', () => {
      openTestChannel('b-id', b)
      destroyClient('a-id')
      const data = msg(ACTIONS.CLIENT_UPDATE, { clients: ['b-id'], statistics: { 'b-id': { lag: Infinity, dataTransferRate: 0 } } })
      expect(a.send).not.toHaveBeenCalledWith(data)
      expect(b.send).toHaveBeenCalledWith(data)
    })

    it('should broadcast client states when lag is updated', () => {
      const ping = msg(ACTIONS.PING, Date.now())
      if (a.onmessage) a.onmessage({data: ping} as MessageEvent)
      expect(a.send).toHaveBeenCalledTimes(3)
    })
  })
})
