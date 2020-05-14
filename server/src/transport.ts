import socketIO, { Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { on, off, act, Action, ACTIONS } from './actions'
import { init, updateLag, addClient, removeClient } from './state'

// @ts-ignore
import wrtc from 'wrtc'
const { RTCPeerConnection } = wrtc

export type ID = string

export interface Config {
  iceServers?: {}[]
  peerTimeout: number
  debugLog: boolean
  fastButUnreliable: boolean
}
const defaultConfig: Config = {
  iceServers: [],
  peerTimeout: 10000,
  debugLog: false,
  fastButUnreliable: true
}

const channels = new Map<ID, Set<RTCDataChannel>>()
let signalingServer: socketIO.Server|null = null

let logger = buildLogger(true)
function buildLogger(debugLog: boolean) {
  return debugLog ? console : {
    log: console.log,
    error: console.error,
    debug: () => {}
  }
}

export function start(httpServerOrPort: any, initialState: {}, onConnect: (id: ID) => void, config = defaultConfig) {
  if (signalingServer) close()
  init(initialState)
  logger = buildLogger(config.debugLog)
  signalingServer = socketIO(httpServerOrPort, { transports: ['websocket'] })
  signalingServer.on('connection', signalingSocket => {
    const id = buildPeer(signalingSocket, config)
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
  const peer = new RTCPeerConnection({ iceServers: config.iceServers })
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
    act(id, ACTIONS.CLOSE)
    channels.delete(id)
    off(id)
    peer.close()
    logger.debug(id, `closed the peer: ${reason}`)
  }
  
  peer.onicecandidate = ({candidate}: any) => signalingSocket.emit('signal', { candidate })
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'disconnected') destroy('iceConnectionState is disconnected')
    if (peer.iceConnectionState === 'closed') destroy('iceConnectionState is closed')
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

  const channel = peer.createDataChannel('data-channel', {
    negotiated: true,
    id: 0,
    ...(config.fastButUnreliable ?
      { ordered: false, maxRetransmits: 0 } :
      { ordered: true, maxPacketLifeTime: 300 })
  })
  buildChannel(id, channel)

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

function buildChannel(id: ID, channel: RTCDataChannel) {
  channels.set(id, channels.get(id) || new Set())
  
  channel.onopen = () => {
    logger.debug(id, `data-channel:`, 'open')
    for (let ch of channels.get(id) || []) { ch.close() }
    channels.get(id)?.add(channel)
    addClient(id)
    act(id, ACTIONS.OPEN)
    on(id, ACTIONS.PING, (theirTime: number) => {
      updateLag(id, Date.now() - theirTime)
    })
  }
  channel.onclose = () => {
    logger.debug(id, `data-channel:`, 'close')
    channel.onerror = channel.onmessage = null
    channels.get(id)?.delete(channel)
    removeClient(id)
    act(id, ACTIONS.CLOSE)
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return;
    logger.error(id, `data-channel:`, error)
    act(id, ACTIONS.ERROR, error)
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    logger.debug(id, `data-channel:`, action)
    act(id, action, ...(attrs || []))
  }
}

export function send(id: ID, action: Action, ...attrs: any) {
  channels.get(id)?.forEach(channel => {
    if(channel.readyState === 'open') {
      logger.debug(id, 'send', action)
      channel.send(JSON.stringify({action, attrs}))
    } else {
      logger.debug(id, `could not send to a '${channel.readyState}' channel`, action)
    }
  })
}

export function broadcast(action: Action, ...attrs: any) {
  for (let id of channels.keys()) {
    send(id, action, ...attrs)
  }
}

export function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any) {
  for (let id of channels.keys()) {
    if (id !== notThisId) send(id, action, ...attrs)
  }
}
