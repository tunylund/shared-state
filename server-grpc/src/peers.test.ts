import { act, ACTIONS, off, on } from './actions'
import { addPeer, peerIds, destroyPeer, send, broadcast, broadcastToOthers, statistics, updateLag } from './peers'
import { state } from './state'

function msg(action: string, attr: any) {
  return {action, attrs: JSON.stringify([attr])}
}

jest.useFakeTimers();
describe('peers', () => {

  const a = {
    close: jest.fn(),
    send: jest.fn()
  }

  const b = {
    close: jest.fn(),
    send: jest.fn()
  }

  beforeEach(() => {
    addPeer('a-id', a)
  })

  afterEach(() => {
    destroyPeer('a-id')
    destroyPeer('b-id')
    off('a-id')
    off('b-id')
  })

  describe('peers', () => {
    it('should keep track of new peers', () => {
      expect(peerIds()).toEqual(['a-id'])
    })
  
    it('should remove disconnected peers', () => {
      destroyPeer('a-id')
      expect(peerIds()).toEqual([])
    })
  })

  describe('send', () => {
    it('should send a message to a peer', () => {
      send('a-id', 'some-action', 'some-value')
      expect(a.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  })

  describe('broadcast', () => {
    it('should broadcast a message to all peers', () => {
      addPeer('b-id', b)
      broadcast('some-action', 'some-value')
      expect(a.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(b.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  })

  describe('broadcastToOthers', () => {
    it('should broadcast to other peers', () => {
      addPeer('b-id', b)
      broadcastToOthers('a-id', 'some-action', 'some-value')
      expect(a.send).not.toHaveBeenCalledWith(msg('some-action', 'some-value'))
      expect(b.send).toHaveBeenCalledWith(msg('some-action', 'some-value'))
    })
  })

  describe('statistics', () => {
    it('should provide statistics', () => {
      expect(statistics('a-id')).toMatchObject({ lag: Infinity, dataTransferRate: 0 })
    })
  })

  describe('updateLag', () => {
    it('should keep track of lag with a PING action', () => {
      const clientTime = Date.now()
      jest.advanceTimersByTime(100)
      updateLag('a-id', clientTime)
      expect(statistics('a-id')?.lag).toBe(100)
    })

    it('should broadcast client states when lag is updated', () => {
      expect(a.send).toHaveBeenCalledTimes(2)
      updateLag('a-id', Date.now())
      expect(a.send).toHaveBeenCalledTimes(3)
    })
  })

  describe('channel behaviour', () => {
    it('should initialize state when channel is open', () => {
      expect(a.send).toHaveBeenCalledWith(msg(ACTIONS.STATE_INIT, state()))
    })

    it('should trigger open event for the peer', () => {
      const opened = jest.fn()
      on('b-id', ACTIONS.OPEN, opened)
      addPeer('b-id', b)
      expect(opened).toHaveBeenCalled()
    })

    it('should trigger close event for disconnected peers', () => {
      const closed = jest.fn()
      on('a-id', ACTIONS.CLOSE, closed)
      destroyPeer('a-id')
      expect(closed).toHaveBeenCalled()
    })

    it('should broadcast peer states when a new peer is added', () => {
      addPeer('b-id', b)
      const data = msg(ACTIONS.CLIENT_UPDATE, {
        peers: ['a-id', 'b-id'],
        statistics: {
          'a-id': { lag: Infinity, dataTransferRate: 0 },
          'b-id': { lag: Infinity, dataTransferRate: 0 }
        }
      })

      expect(a.send).toHaveBeenLastCalledWith(data)
      expect(b.send).toHaveBeenLastCalledWith(data)
    })

    it('should broadcast peer states when a peer is destroyed', () => {
      addPeer('b-id', b)
      destroyPeer('a-id')
      const data = msg(ACTIONS.CLIENT_UPDATE, { peers: ['b-id'], statistics: { 'b-id': { lag: Infinity, dataTransferRate: 0 } } })
      expect(a.send).not.toHaveBeenCalledWith(data)
      expect(b.send).toHaveBeenLastCalledWith(data)
    })
  })
})