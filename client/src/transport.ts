import { act, ACTIONS } from './actions'

const channels = new Set<RTCDataChannel>()

function buildPeer(socket: SocketIOClient.Socket, config: Config) {
  const peer = new RTCPeerConnection()
  
  peer.onicecandidate = ({candidate}) => socket.emit('signal', {candidate})
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'closed') closePeer(peer, socket)
    //@ts-ignore
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed') closePeer(peer, socket) }
  peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed') closePeer(peer, socket) }

  socket.on('signal', (msg: Signal) => handleSignal(msg, peer, socket))

  addChannel(peer.createDataChannel('data-channel', { negotiated: true, id: 0 }), config)

  return peer
}

function closePeer(peer: RTCPeerConnection, socket: SocketIOClient.Socket) {
  peer.onicecandidate = null
  peer.oniceconnectionstatechange = null
  peer.onconnectionstatechange = null
  peer.onsignalingstatechange = null
  peer.ondatachannel = null
  peer.close()
  socket.off('signal')
  console.log('closed the peer')
}

interface Signal {
  id?: string
  description?: RTCSessionDescription
  candidate?: RTCIceCandidate
}

async function handleSignal({ id, description, candidate }: Signal, peer: RTCPeerConnection, socket: SocketIOClient.Socket) {
  if (id) {
    act(ACTIONS.INIT, [id])
  } else if (description && description.type === 'offer') {
    console.log('signal:', `received an offer`)
    await peer.setRemoteDescription(description)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    socket.emit('signal', { description: peer.localDescription })
    console.log('signal:', `provided an answer`)
  } else if (candidate) {
    await peer.addIceCandidate(candidate)
  }
}

function addChannel(channel: RTCDataChannel, config: Config) {
  channel.onopen = () => {
    console.log(`data-channel-${channel.id}:`, 'open')
    for (let ch of channels) { ch.close() }
    channels.add(channel)
    act(ACTIONS.OPEN)
    startLagPingPong(config)
  }
  channel.onclose = () => {
    console.log(`data-channel-${channel.id}:`, 'close')
    act(ACTIONS.CLOSE)
    channel.onerror = channel.onmessage = null
    channels.delete(channel)
    if (channels.size === 0) stopLagPingPong()
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return;
    console.error(`data-channel-${channel.id}:`, error)
    act(ACTIONS.ERROR, [error])
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    act(action, attrs)
  }
}

let lagPing: any
function startLagPingPong(config: Config) {
  function ping() {
    send(ACTIONS.PING, Date.now())
    lagPing = setTimeout(ping, config.lagInterval)
  }
  ping()
}
function stopLagPingPong() {
  clearTimeout(lagPing)
  lagPing = null
}

interface Config { lagInterval: number }
const defaultConfig: Config = {lagInterval: 3000}

export function connect(url: string, config = defaultConfig): () => void {
  const socket = io.connect(url, { transports: ['websocket'] })
  let peer: RTCPeerConnection|null
  socket.on('connect', () => {
    if (peer) closePeer(peer, socket)
    peer = buildPeer(socket, config)
  })
  socket.on('disconnect', () => {
    if (peer) closePeer(peer, socket)
    peer = null
  })
  socket.on('connect_error', (error: any) => act(ACTIONS.ERROR, [error]))
  socket.on('connect_timeout', (error: any) => act(ACTIONS.ERROR, [error]))

  return disconnect.bind({}, socket)
}

function disconnect(socket: SocketIOClient.Socket) {
  socket && socket.close()
  socket.off('connect')
  socket.off('connect_error')
  socket.off('connect_timeout')
  socket.off('disconnect')
}

export function send(action: string, ...attrs: any[]) {
  channels.forEach(channel => {
    if(channel.readyState === 'open') {
      channel.send(JSON.stringify({action, attrs}))
    } else {
      console.error(`could not send to a ${channel.readyState} channel`, action)
    }
  })
}
