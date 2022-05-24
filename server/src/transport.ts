import { Socket, Server as SocketIOServer } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { init } from './state'
// @ts-ignore
import wrtc from 'wrtc'
import logger, { setLogLevel } from './logger'
import { destroyClient, createClient } from './clients'
const { RTCPeerConnection } = wrtc

export type ID = string

interface RTCOAuthCredential {}
interface RTCIceServer {
  credential?: string | RTCOAuthCredential;
  credentialType?: RTCIceCredentialType;
  urls: string | string[];
  username?: string;
}
export interface Config {
  iceServers?: RTCIceServer[]
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
  for(let {urls} of (iceServers || [])) {
    const urlarr = Array.isArray(urls) ? urls : [urls]
    for (let url of urlarr) {
      if (url.includes('stun:') || url.includes('turn:')) continue
      else throw new Error(`Ice Server urls must have 'stun:' or 'turn:' protocol defined: '${url}' seems to not have it.`)
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
    signalingSocket
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
  const peer: RTCPeerConnection = new RTCPeerConnection({ iceServers: config.iceServers })
  logger.debug(id, 'build a peer')
  
  peer.onnegotiationneeded = async () => {
    try {
      const offer = await peer.createOffer()
      peer.setLocalDescription(offer)
      signalingSocket.emit('signal', { description: offer })
      logger.debug(id, 'signal:', 'provided an offer')
    } catch (err) {
      logger.error(id, 'signal', err)
    }
  }

  function destroy(reason: string) {
    peer.onnegotiationneeded = null
    peer.onicecandidate = null
    peer.onconnectionstatechange = null
    peer.oniceconnectionstatechange = null
    peer.onsignalingstatechange = null
    peer.ondatachannel = null
    signalingSocket.off('signal', onSignal)
    signalingSocket.off('disconnect', onDisconnect)
    signalingSocket.disconnect(true)
    destroyClient(id)
    peer.close()
    logger.debug(id, `closed the peer: ${reason}`)
  }
  
  peer.onicecandidate = ({candidate}: any) => signalingSocket.emit('signal', { candidate })
  peer.onicecandidateerror = (ev) => logger.debug('ice candidate error', ev)
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'disconnected') destroy('iceConnectionState is disconnected')
    if (peer.iceConnectionState === 'closed') destroy('iceConnectionState is closed')
    // @ts-ignore
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed') destroy('connectionState is closed') }
  peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed') destroy('signalingState is closed') }

  setTimeout(() => {
    if (peer.connectionState === 'new') {
      destroy('timeout establishing a peer connection')
    }
  }, config.peerTimeout)

  const onSignal = (msg: string) => handleSignal(id, peer, msg)
  const onDisconnect = () => destroy('signaling socket disconnected')
  signalingSocket.on('signal', onSignal)
  signalingSocket.on('disconnect', onDisconnect)
  signalingSocket.emit('signal', { id })

  if (peer.connectionState === 'closed') {
    destroy('cannot create a channel on a peer that is already in a closed state')
  } else {
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

async function handleSignal(id: ID, peer: RTCPeerConnection, msg: any) {
  const { description, candidate } = msg
  try {
    if (description && description.type === 'answer') {
      await peer.setRemoteDescription(description)
      logger.debug(id, 'signal:', `accepted a remote ${description.type}`)
    } else if (candidate) {
      if (peer.remoteDescription && candidate.candidate) {
        await peer.addIceCandidate(candidate)
      }
    }
  } catch(err) {
      logger.error(id, err);
  }
}

