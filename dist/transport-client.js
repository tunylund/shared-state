let socket = null
const channels = new Set()
const actions = new Map()

function resetPeer() {
  const peer = new RTCPeerConnection()
  
  peer.onicecandidate = ({candidate}) => signal({candidate})
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'closed') close(peer)
    if (peer.iceConnectionState === 'failed') peer.restartIce()
  }
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed') close(peer) }
  peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed') close(peer) }

  addChannel(peer.createDataChannel('data-channel', { negotiated: true, id: 0 }))

  return peer
}

function close(peer) {
  peer.onicecandidate = null
  peer.oniceconnectionstatechange = null
  peer.onconnectionstatechange = null
  peer.onsignalingstatechange = null
  peer.ondatachannel = null
  peer.close()
  socket.off('signal')
  console.log('closed the peer')
  peer = null
}

function signal(msg) {
  socket.emit('signal', msg)
}

async function handleSignal(msg, peer) {
  const { id, description, candidate } = msg
  if (id) {
    act('INIT', id)
  } else if (description && description.type === 'offer') {
    console.log('signal:', `received an offer`)
    await peer.setRemoteDescription(description)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    signal({ description: peer.localDescription })
    console.log('signal:', `provided an answer`)
  } else if (candidate) {
    await peer.addIceCandidate(candidate)
  }
}

function addChannel(channel) {
  channel.onopen = () => {
    console.log(`data-channel-${channel.id}:`, 'open')
    for (let ch of channels) { ch.close() }
    channels.add(channel)
    act('open')
  }
  channel.onclose = () => {
    console.log(`data-channel-${channel.id}:`, 'close')
    act('close')
    channel.onerror = channel.onmessage = null
    channels.delete(channel)
  }
  channel.onerror = error => {
    if (error.error.message === 'Transport channel closed') return;
    console.error(`data-channel-${channel.id}:`, error)
    act('error', [error])
  }
  channel.onmessage = msg => {
    const {action, attrs} = JSON.parse(msg.data)
    act(action, attrs)
  }
}

function act(action, attrs = []) {
  try {
    if (actions.has(action)) {
      actions.get(action).forEach(fn => fn(...attrs))
    }
  } catch (err) {
    console.error(err)
  }
}

export function connect() {
  socket = io.connect({ transports: ['websocket'] })
  let peer
  socket.on('connect', () => {
    if (peer) close(peer)
    peer = resetPeer(peer)
    socket.on('signal', msg => handleSignal(msg, peer))
  })
  socket.on('connect_error', error => act('socket-error', [error]))
  socket.on('connect_timeout', error => act('socket-error', [error]))
}

export function on(ev, fn) {
  if (!actions.has(ev)) actions.set(ev, new Set())
  actions.get(ev).add(fn)
}

export function off(ev, fn = null) {
  if (actions.has(ev)) {
    if (fn) actions.get(ev).delete(fn)
    else actions.delete(ev)
  }
}

export function send(action, ...attrs) {
  channels.forEach(channel => {
    if(channel.readyState === 'open') {
      channel.send(JSON.stringify({action, attrs}))
    } else {
      console.error(`could not send to a ${channel.readyState} channel`, action)
    }
  })
}
