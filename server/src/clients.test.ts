import { createClient, clients, destroyClient, send, broadcast, broadcastToOthers, statistics } from "./clients"
import { on, ACTIONS, off } from "./actions"
import { state } from "./state"
import { DataChannel } from "node-datachannel/*"
jest.mock('./logger')

describe('clients', () => {

  function mockChannel() {
    const mock = {
      openedCbs: [] as (() => void)[],
      closedCbs: [] as (() => void)[],
      onMessageCbs: [] as ((msg: string | Buffer | ArrayBuffer) => void)[],
      onOpen: (cb: any) => { mock.openedCbs.push(cb) },
      onClosed: (cb: any) => { mock.closedCbs.push(cb) },
      onError: (cb: any) => { },
      onMessage: (cb: any) => { mock.onMessageCbs.push(cb) }, 
      onBufferedAmountLow: (cb: any) => { },
      open: () => { mock.openedCbs.forEach((cb: any) => cb()) },
      close: jest.fn((): any => mock.closedCbs.forEach((cb: any) => cb())),
      isOpen: () => true,
      sendMessage: jest.fn(),
    }
    return mock
  }
  function openTestChannel(id: string, client: ReturnType<typeof mockChannel>) {
    createClient(id, client as any as DataChannel);
    client.open()
  }
  function msg(action: string, attr: any) {
    return JSON.stringify({action, attrs: [attr]})
  }
  let channelA = mockChannel()
  let channelB = mockChannel()

  beforeEach(() => {
    channelA = mockChannel()
    channelB = mockChannel()
  })
  afterEach(() => {
    off('a-id')
    off('b-id')
    destroyClient('a-id')
    destroyClient('b-id')
  })

  describe('creation and destruction of clients', () => {
    it('should keep track of clients', () => {
      const opened = jest.fn()
      on('a-id', ACTIONS.OPEN, opened)

      openTestChannel('a-id', channelA)

      expect(clients()).toEqual(['a-id'])
      expect(opened).toHaveBeenCalled()
    })
    
    it('should destroy the client', () => {
      const closed = jest.fn()
      on('a-id', ACTIONS.CLOSE, closed)

      destroyClient('a-id')

      expect(closed).toHaveBeenCalled()
      expect(clients()).toEqual([])
    })
  })
  
  describe('messaging', () => {
    it('should send a message to a client', () => {
      openTestChannel('a-id', channelA)

      send('a-id', 'some-action', 'some-value')

      expect(channelA.sendMessage).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  
    it('should broadcast a message to all clients', () => {
      openTestChannel('a-id', channelA)
      openTestChannel('b-id', channelB)

      broadcast('some-action', 'some-value')

      expect(channelA.sendMessage).toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(channelB.sendMessage).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  
    it('should broadcast to other clients', () => {
      openTestChannel('a-id', channelA)
      openTestChannel('b-id', channelB)

      broadcastToOthers('a-id', 'some-action', 'some-value')

      expect(channelA.sendMessage).not.toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(channelB.sendMessage).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
    
    it('should prepare a statistics collector', () => {
      openTestChannel('a-id', channelA)

      expect(statistics('a-id')).toMatchObject({ lag: Infinity, dataTransferRate: 0 })
    })
  })

  describe('channel behaviour', () => {
    it('should invoke initialize state when the channel is open', () => {
      openTestChannel('a-id', channelA)

      expect(channelA.sendMessage).toHaveBeenCalledWith(msg(ACTIONS.STATE_INIT, state()))
    })

    it('should destroy the client if all channels are closed', () => {
      const closedAction = jest.fn()
      on('a-id', ACTIONS.CLOSE, closedAction)
      openTestChannel('a-id', channelA)

      channelA.closedCbs.forEach(cb => cb())

      expect(closedAction).toHaveBeenCalled()
      expect(clients()).toEqual([])
    })

    it('should close previous channels when a new channel is created', () => {
      openTestChannel('a-id', channelA)
      openTestChannel('a-id', mockChannel())

      expect(channelA.close).toHaveBeenCalled()
    })

    it('should not close the client when a new channel is added', () => {
      const closed = jest.fn()
      on('a-id', ACTIONS.CLOSE, closed)

      openTestChannel('a-id', channelA)
      openTestChannel('a-id', mockChannel())

      expect(closed).not.toHaveBeenCalled()
      expect(clients()).toEqual(['a-id'])
    })

    it('should keep track of lag', () => {
      const data = msg(ACTIONS.PING, Date.now())
      openTestChannel('a-id', channelA)

      channelA.onMessageCbs.forEach(cb => cb(data))

      expect(statistics('a-id').lag).toBeLessThan(10)
    })

    it('should broadcast client states when a new client is added', () => {
      openTestChannel('a-id', channelA)
      openTestChannel('b-id', channelB)

      const data = msg(ACTIONS.CLIENT_UPDATE, { clients: ['a-id', 'b-id'], statistics: { 'a-id': { lag: Infinity, dataTransferRate: 0 }, 'b-id': { lag: Infinity, dataTransferRate: 0 } } })
      expect(channelA.sendMessage).toHaveBeenLastCalledWith(data)
      expect(channelB.sendMessage).toHaveBeenLastCalledWith(data)
    })

    it('should broadcast client states when a client is destroyed', () => {
      openTestChannel('a-id', channelA)
      openTestChannel('b-id', channelB)

      destroyClient('a-id')

      const data = msg(ACTIONS.CLIENT_UPDATE, { clients: ['b-id'], statistics: { 'b-id': { lag: Infinity, dataTransferRate: 0 } } })
      expect(channelA.sendMessage).not.toHaveBeenCalledWith(data)
      expect(channelB.sendMessage).toHaveBeenCalledWith(data)
    })

    it('should broadcast client states when lag is updated', () => {
      openTestChannel('a-id', channelA)

      const ping = msg(ACTIONS.PING, Date.now())
      channelA.onMessageCbs.forEach(cb => cb(ping))

      expect(channelA.sendMessage).toHaveBeenCalledTimes(3)
    })
  })
})
