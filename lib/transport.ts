import { Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'
// @ts-ignore
import { RTCPeerConnection } from 'wrtc'
import { off, act, Action, CLOSE, OPEN, ERROR } from './actions'

export type ID = string

export interface Config {
  iceServers?: {}[]
  peerTimeout: number
}
const defaultConfig: Config = {
  iceServers: [],
  peerTimeout: 10000
}

const channels = new Map<ID, Set<RTCDataChannel>>()

export function buildPeer(signalingSocket: Socket, config: Config = defaultConfig): ID {
  const id = uuid()
  const peer = new RTCPeerConnection({ iceServers: config.iceServers })
  console.log(id, 'build a peer')
  
  peer.onnegotiationneeded = async () => {
    try {
      const offer = await peer.createOffer()
      peer.setLocalDescription(offer)
      signalingSocket.emit('signal', { description: offer })
      console.log(id, 'signal:', 'provided an offer')
    } catch (err) {
      console.error(id, 'signal', err)
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
    act(id, CLOSE)
    channels.delete(id)
    off(id)
    peer.close()
    console.log(id, `closed the peer: ${reason}`)
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

  buildChannel(id, peer)

  return id
}

async function handleSignal(id: ID, peer: RTCPeerConnection, msg: any) {
  const { description, candidate } = msg
  try {
    if (description && description.type === 'answer') {
      await peer.setRemoteDescription(description)
      console.log(id, 'signal:', `accepted a remote ${description.type}`)
    } else if (candidate) {
      if (peer.remoteDescription && candidate.candidate) {
        await peer.addIceCandidate(candidate)
      }
    }
  } catch(err) {
      console.error(id, err);
  }
}

function buildChannel(id: ID, peer: RTCPeerConnection) {
  const channel: RTCDataChannel = peer.createDataChannel('data-channel', {negotiated: true, id: 0})
  channels.set(id, channels.get(id) || new Set())
  
  channel.onopen = () => {
    console.log(id, `data-channel:`, 'open')
    for (let ch of channels.get(id) || []) { ch.close() }
    channels.get(id)?.add(channel)
    act(id, OPEN)
  }
  channel.onclose = () => {
    console.log(id, `data-channel:`, 'close')
    channel.onerror = channel.onmessage = null
    channels.get(id)?.delete(channel)
    act(id, CLOSE)
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return;
    console.error(id, `data-channel:`, error)
    act(id, ERROR, error)
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    console.log(id, `data-channel:`, action)
    act(id, action, ...(attrs || []))
  }
}

export function send(id: ID, action: Action, ...attrs: any) {
  channels.get(id)?.forEach(channel => {
    if(channel.readyState === 'open') {
      channel.send(JSON.stringify({action, attrs}))
    } else {
      console.error(id, `could not send to a '${channel.readyState}' channel`, action)
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
