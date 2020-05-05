import socketIO, { Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'
// @ts-ignore
import { RTCPeerConnection } from 'wrtc'
import { Server } from 'http'

type ID = string
type Action = string

interface IceServer {}

interface Signal {
  description?: string,
  candidate?: string
}

const channels = new Map<ID, Set<RTCDataChannel>>()

function signal(socket: Socket, msg: Signal) {
  socket.emit('signal', JSON.stringify(msg))
}

async function handleSignal(id: ID, peer: RTCPeerConnection, msg: string) {
  const { description, candidate } = JSON.parse(msg)
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

function buildPeer(socket: Socket, iceServers: IceServer[]): ID {
  const id = uuid()
  console.log(id, 'building a peer for socket:', socket.id)
  const peer = new RTCPeerConnection({ iceServers })
  
  peer.onnegotiationneeded = async () => {
    try {
      const offer = await peer.createOffer()
      peer.setLocalDescription(offer)
      signal(socket, { description: offer })
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
    socket.off('signal', onSignal)
    socket.off('disconnect', onDisconnect)
    socket.disconnect(true)
    act(id, 'close')
    channels.delete(id)
    actions.delete(id)
    peer.close()
    console.log(id, `closed the peer: ${reason}`)
  }
  
  peer.onicecandidate = ({candidate}: any) => signal(socket, { candidate })
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'disconnected') destroy('iceConnectionState is disconnected')
    if (peer.iceConnectionState === 'closed') destroy('iceConnectionState is closed')
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed') destroy('connectionState is closed') }
  peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed') destroy('signalingSate is closed') }

  setTimeout(() => {
    if (peer.connectionState === 'new') {
      destroy('timeout establishing a peer connection')
    }
  }, 10000)

  const onSignal = (msg: string) => handleSignal(id, peer, msg)
  const onDisconnect = () => destroy('signaling socket disconnected')
  socket.on('signal', onSignal)
  socket.on('disconnect', onDisconnect)

  buildChannel(id, peer)

  return id
}

function buildChannel(id: ID, peer: RTCPeerConnection) {
  const channel: RTCDataChannel = peer.createDataChannel('data-channel', {negotiated: true, id: 0})
  channels.set(id, chs())

  function chs(): Set<RTCDataChannel> {
    return channels.get(id) || new Set()
  }
  
  channel.onopen = () => {
    console.log(id, `data-channel:`, 'open')
    for (let ch of chs()) { ch.close() }
    chs().add(channel)
    act(id, 'open')
  }
  channel.onclose = () => {
    console.log(id, `data-channel:`, 'close')
    channel.onerror = channel.onmessage = null
    chs().delete(channel)
    act(id, 'close')
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return;
    console.error(id, `data-channel:`, error)
    act(id, 'error', [error])
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    act(id, action, attrs)
  }
}


const actions = new Map<ID, Map<Action, Set<Function>>>()
function getActions(id: ID, action: Action) {
  const accs = actions.get(id) || new Map<Action, Set<Function>>()
  const fns = accs.get(action) || new Set()
  actions.set(id, accs)
  accs.set(action, fns)
  return fns
}

const emptySet = new Set<any>()
function act(id: ID, action: Action, ...attrs: any[]) {
  for (let fn of actions.get(id)?.get(action) || emptySet) {
    try {
      fn(...attrs)
    } catch (err) {
      console.error(id, err)
    }
  }
}

let io: socketIO.Server
export function start(httpServer: Server, onConnect = (id: ID) => {}, iceServers = []) {
  if (io) io.close()
  io = socketIO(httpServer, { transports: ['websocket'] })
  io.on('connection', client => {
    const id = buildPeer(client, iceServers)
    onConnect(id)
  })
}

export function stop() {
  if (io) io.close()
}

export function on(id: ID, action: Action, fn: Function) {
  if (!actions.has(id)) actions.set(id, new Map())
  getActions(id, action).add(fn)
}

export function off(id: ID, action: Action, fn?: Function) {
  if (fn) actions.get(id)?.get(action)?.delete(fn)
  else actions.get(id)?.delete(action)
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
