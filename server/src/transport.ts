import { Socket, Server as SocketIOServer } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { init } from './state'
import logger, { setLogLevel } from './logger'
import { destroyClient, createClient } from './clients'
import nodeDataChannel, { IceServer, PeerConnection } from 'node-datachannel';

export type ID = string

export interface Config {
  iceServers: (string|IceServer)[]
  peerTimeout: number
  debugLog: boolean
  fastButUnreliable: boolean
  path: string
}
const defaultConfig: Config = {
  iceServers: [],
  peerTimeout: 10000,
  debugLog: false,
  fastButUnreliable: true,
  path: '/shared-state'
}

let signalingServer: SocketIOServer|null = null

function validateConfiguration({iceServers}: Config) {
  for(let iceServer of (iceServers || [])) {
    if (typeof iceServer === 'string') {
      if (iceServer.includes('stun:') || iceServer.includes('turn:')) continue
      else throw new Error(`Ice Server urls must have 'stun:' or 'turn:' protocol defined: '${iceServer}' seems to not have it.`)
    }
  }
}

export function start(httpServerOrPort: any, initialState: {}, onConnect: (id: ID) => any, config?: Partial<Config>) {
  const conf = {...defaultConfig, ...config}
  validateConfiguration(conf)
  if (signalingServer) close()
  init(initialState)
  setLogLevel(conf.debugLog)
  signalingServer = new SocketIOServer(httpServerOrPort, { transports: ['websocket'], path: conf.path })
  signalingServer.on('connection', signalingSocket => {
    const id = buildPeer(signalingSocket, conf)
    onConnect(id)
  })
}

export function stop() {
  if (signalingServer) {
    signalingServer.close()
    signalingServer = null
  }
}

function buildPeer(signalingSocket: Socket, config: Config): ID {
  const id = uuid()
  logger.debug(id, 'connection requested, building a peer')

  const peer = new nodeDataChannel.PeerConnection(`peer-${id}`, { iceServers: config.iceServers })

  function destroy(reason: string) {
    signalingSocket.off('signal', onSignal)
    signalingSocket.off('disconnect', onDisconnect)
    signalingSocket.disconnect(true)
    destroyClient(id)
    peer.close()
    logger.debug(id, `closed the peer: ${reason}`)
  }
  
  peer.onLocalDescription((sdp, type) => {
    signalingSocket.emit('signal', { description: { sdp, type } });
    logger.debug(id, 'signal:', 'provided an offer to the client')
  });
  peer.onLocalCandidate((candidate, mid) => {
    signalingSocket.emit('signal', { candidate, mid });
    logger.debug(id, 'signal:', 'provided an candidate to the client')
  });
  peer.onStateChange((stateString) => {
    const state = stateString as "RTC_CONNECTING" | "RTC_CONNECTED" | "RTC_DISCONNECTED" | "RTC_FAILED" | "RTC_CLOSED"

    if (state === "RTC_CONNECTED") {
      const channel = peer.createDataChannel('data-channel', {
        negotiated: true,
        id: 0,
        ...(config.fastButUnreliable ? { ordered: false, maxRetransmits: 0 } : { ordered: true, maxPacketLifeTime: 300 })
      })
      createClient(id, channel)
    } else if (state === "RTC_DISCONNECTED") {
      destroy("iceConnectionState is disconnected")
    } else if (state === "RTC_FAILED") {
      destroy("iceConnectionState has failed")
    } else if (state === "RTC_CLOSED") {
      destroy("iceConnectionState is closed")
    }

    logger.debug(id, 'state:', state)
  });
  peer.onGatheringStateChange((stateString) => {
    const state = stateString as "RTC_GATHERING_INPROGRESS" | "RTC_GATHERING_COMPLETE"
    logger.debug(id, 'state:', state)
  });
  peer.onIceStateChange((state) => {
    logger.debug(id, 'ice state:', state)
  });
  peer.onTrack((track) => {
    logger.debug(id, 'track:', track)
  });

  setTimeout(() => {
    if (peer.state() === 'new') {
      destroy('timeout establishing a peer connection')
    }
  }, config.peerTimeout)

  const onSignal = (msg: string) => handleSignal(id, peer, msg)
  const onDisconnect = () => destroy('signaling socket disconnected')
  signalingSocket.on('signal', onSignal)
  signalingSocket.on('disconnect', onDisconnect)
  signalingSocket.emit('signal', { id })

  if (peer.state() === 'closed') {
    destroy('cannot create a channel on a peer that is already in a closed state')
  } else if (peer.state() === 'new') {
    const channel = peer.createDataChannel('data-channel', {
      negotiated: true,
      id: 0,
      ...(config.fastButUnreliable ?
        { ordered: false, maxRetransmits: 0 } :
        { ordered: true, maxPacketLifeTime: 300 })
    })
    createClient(id, channel)
  }

  return id
}

async function handleSignal(id: ID, peer: PeerConnection, msg: any) {
  const { description, candidate } = msg
  try {
    if (description && description.type === 'answer') {
      await peer.setRemoteDescription(description.sdp, description.type)
      logger.debug(id, 'signal:', `accepted a remote ${description.type}`)
    } else if (candidate) {
      if (peer.remoteDescription() && candidate.candidate) {
        peer.addRemoteCandidate(candidate.candidate, candidate.sdpMid)
      }
    }
  } catch(err) {
      logger.error(id, err);
  }
}