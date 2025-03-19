import { Socket, Server as SocketIOServer } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { init } from './state'
import logger, { setLogLevel } from './logger'
import { destroyClient, createClient } from './clients'
import { IceServer, PeerConnection } from 'node-datachannel';
import { RemoteRTCPeerConnection } from './RemoteRTCPeerConnection'

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
    const id = createRTCConnection(signalingSocket, conf)
    onConnect(id)
  })
}

export function stop() {
  if (signalingServer) {
    signalingServer.close()
    signalingServer = null
  }
}

function createRTCConnection(signalingSocket: Socket, config: Config): ID {
  const id = uuid()
  logger.debug(id, 'connection requested, building a peer')

  const peer = new PeerConnection(`peer-${id}`, { iceServers: config.iceServers })
  const remotePeer = new RemoteRTCPeerConnection(id, signalingSocket, peer)

  function destroy(reason: string) {
    destroyClient(id)
    remotePeer.destroy()
    peer.close()
    logger.debug(id, `closed the peer: ${reason}`)
  }
  
  peer.onLocalDescription((sdp, type) => {
    remotePeer.setRemoteDescription({ sdp, type })
  });

  peer.onLocalCandidate((candidate, mid) => {
    remotePeer.addRemoteCandidate({ candidate, sdpMid: mid })
  });

  remotePeer.on('onicecandidate', (candidate: RTCIceCandidate | null) => {
    if (peer.remoteDescription()) {
      peer.addRemoteCandidate(candidate?.candidate ?? "", candidate?.sdpMid ?? "")
    }
  })

  remotePeer.on('onnewrtcsessiondescription', async (description: RTCSessionDescription) => {
    peer.setRemoteDescription(description.sdp, description.type)
  })

  remotePeer.on('disconnect', () => {
    destroy('signaling socket disconnected')
  })

  peer.onStateChange((state: RTCPeerConnectionState | string) => {
    if (state === "connected") {
      // createDataChannelAndClient(id, peer, config)
    } else if (state === "disconnected") {
      destroy("iceConnectionState is disconnected")
    } else if (state === "failed") {
      destroy("iceConnectionState has failed")
    } else if (state === "closed") {
      destroy("iceConnectionState is closed")
    }

    logger.debug(id, 'state:', state)
  });
  peer.onGatheringStateChange((state: RTCIceGatheringState | string) => {
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

  remotePeer.init(id)

  if (peer.state() === 'closed') {
    destroy('cannot create a channel on a peer that is already in a closed state')
  } else if (peer.state() === 'new') {
    createDataChannelAndClient(id, peer, config)
  }

  return id
}

function createDataChannelAndClient(id: string, peer: PeerConnection, config: Config) {
  const channel = peer.createDataChannel('data-channel', {
    negotiated: true,
    id: 0,
    ...(config.fastButUnreliable ? { ordered: false, maxRetransmits: 0 } : { ordered: true, maxPacketLifeTime: 300 })
  })
  createClient(id, channel)
}
