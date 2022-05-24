import { act, ACTIONS } from './actions'
import logger, { setLogLevel } from './logger'
import { addChannel } from './client'

declare var io: any;
declare type Socket = any;

export function connect(url: string, config?: Partial<Config>): () => void {
  const conf = {...defaultConfig, ...config}
  const socket = io.connect(url, { transports: ['websocket'], path: conf.path })
  let peer: RTCPeerConnection|null
  setLogLevel(conf.debugLog)
  socket.on('connect', () => {
    if (peer) closePeer(peer, socket)
    peer = buildPeer(socket, conf)
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

function buildPeer(socket: Socket, config: Config) {
  const peer = new RTCPeerConnection({ iceServers: config.iceServers })
  
  peer.onicecandidate = ({candidate}) => socket.emit('signal', {candidate})
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'closed') closePeer(peer, socket)
    //@ts-ignore
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed') closePeer(peer, socket) }
  peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed') closePeer(peer, socket) }

  socket.on('signal', (msg: Signal) => handleSignal(msg, peer, socket))

  addChannel(peer.createDataChannel('data-channel', {
    negotiated: true,
    id: 0,
    ...(config.fastButUnreliable ?
      { ordered: false, maxRetransmits: 0 } :
      { ordered: true, maxPacketLifeTime: 300 })
  }), config.lagInterval)

  return peer
}

function closePeer(peer: RTCPeerConnection, socket: Socket) {
  peer.onicecandidate = null
  peer.oniceconnectionstatechange = null
  peer.onconnectionstatechange = null
  peer.onsignalingstatechange = null
  peer.ondatachannel = null
  peer.close()
  socket.off('signal')
  logger.debug('closed the peer')
}

interface Signal {
  id?: string
  description?: RTCSessionDescription
  candidate?: RTCIceCandidate
}

async function handleSignal({ id, description, candidate }: Signal, peer: RTCPeerConnection, socket: Socket) {
  if (id) {
    act(ACTIONS.INIT, [id])
  } else if (description && description.type === 'offer') {
    logger.debug('signal:', `received an offer`)
    await peer.setRemoteDescription(description)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    socket.emit('signal', { description: peer.localDescription })
    logger.debug('signal:', `provided an answer`)
  } else if (candidate) {
    await peer.addIceCandidate(candidate)
  }
}

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
