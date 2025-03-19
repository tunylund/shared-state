import { act, ACTIONS } from './actions'
import logger, { setLogLevel } from './logger'
import { addChannel } from './client'
import { RemoteRTCPeerConnection } from './RemoteRTCPeerConnection';

declare var io: any;
declare type Socket = any;


interface Config {
  lagInterval: number
  debugLog: boolean
  fastButUnreliable: boolean
  iceServers: RTCIceServer[]
  path: string
}

const defaultConfig: Config = {
  lagInterval: 3000,
  debugLog: false,
  fastButUnreliable: true,
  iceServers: [],
  path: '/shared-state'
}

export function connect(url: string, config?: Partial<Config>): () => void {
  const conf = {...defaultConfig, ...config}
  const socket = io.connect(url, { transports: ['websocket'], path: conf.path })
  let peer: RTCPeerConnection|null
  setLogLevel(conf.debugLog)
  socket.on('connect', () => {
    if (peer) closePeer(peer, socket)
    peer = createRTCConnection(socket, conf)
  })
  socket.on('disconnect', () => {
    if (peer) closePeer(peer, socket)
    peer = null
  })
  socket.on('error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('disconnect', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_timeout', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('reconnect_error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('reconnect_failed', (error: any) => act(ACTIONS.ERROR, [error]))

  return disconnect.bind({}, socket)
}

function disconnect(socket: Socket) {
  socket && socket.close()
  socket.off('connect')
  socket.off('connect_error')
  socket.off('connect_timeout')
  socket.off('disconnect')
}

function createRTCConnection(socket: Socket, config: Config) {
  const peer = new RTCPeerConnection({ iceServers: config.iceServers })
  const remotePeer = new RemoteRTCPeerConnection(socket)

  remotePeer.addEventListener('onnewrtcsessiondescription', async (description: RTCSessionDescription) => {
    await peer.setRemoteDescription(description)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    remotePeer.setRemoteDescription(peer.localDescription)
  })

  remotePeer.addEventListener('onicecandidate', (candidate: RTCIceCandidate | null) => {
    peer.addIceCandidate(candidate)
  })
  
  peer.onicecandidate = ({ candidate }) => {
    remotePeer.addRemoteCandidate(candidate)
  }

  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'closed') closePeer(peer, remotePeer)
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }

  peer.onconnectionstatechange = () => {
    if (peer.connectionState === 'closed') closePeer(peer, remotePeer)
  }

  peer.onsignalingstatechange = () => {
    if (peer.signalingState === 'closed') closePeer(peer, remotePeer)
  }

  addChannel(peer.createDataChannel('data-channel', {
    negotiated: true,
    id: 0,
    ...(config.fastButUnreliable ?
      { ordered: false, maxRetransmits: 0 } :
      { ordered: true, maxPacketLifeTime: 300 })
  }), config.lagInterval)

  return peer
}

function closePeer(peer: RTCPeerConnection, remotePeer: RemoteRTCPeerConnection) {
  peer.close()
  remotePeer.destroy()
  logger.debug('closed the peer')
}

