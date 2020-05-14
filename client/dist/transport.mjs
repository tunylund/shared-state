import { act, ACTIONS } from './actions.mjs';
const channels = new Set();
function buildPeer(socket, config) {
    const peer = new RTCPeerConnection();
    peer.onicecandidate = ({ candidate }) => socket.emit('signal', { candidate });
    peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'closed')
            closePeer(peer, socket);
        //@ts-ignore
        if (peer.iceConnectionState === 'failed')
            peer.restartIce();
    };
    peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed')
        closePeer(peer, socket); };
    peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed')
        closePeer(peer, socket); };
    socket.on('signal', (msg) => handleSignal(msg, peer, socket));
    addChannel(peer.createDataChannel('data-channel', {
        negotiated: true,
        id: 0,
        ...(config.fastButUnreliable ?
            { ordered: false, maxRetransmits: 0 } :
            { ordered: true, maxPacketLifeTime: 300 })
    }), config);
    return peer;
}
function closePeer(peer, socket) {
    peer.onicecandidate = null;
    peer.oniceconnectionstatechange = null;
    peer.onconnectionstatechange = null;
    peer.onsignalingstatechange = null;
    peer.ondatachannel = null;
    peer.close();
    socket.off('signal');
    logger.debug('closed the peer');
}
async function handleSignal({ id, description, candidate }, peer, socket) {
    if (id) {
        act(ACTIONS.INIT, [id]);
    }
    else if (description && description.type === 'offer') {
        logger.debug('signal:', `received an offer`);
        await peer.setRemoteDescription(description);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('signal', { description: peer.localDescription });
        logger.debug('signal:', `provided an answer`);
    }
    else if (candidate) {
        await peer.addIceCandidate(candidate);
    }
}
function addChannel(channel, config) {
    channel.onopen = () => {
        logger.debug(`data-channel-${channel.id}:`, 'open');
        for (let ch of channels) {
            ch.close();
        }
        channels.add(channel);
        act(ACTIONS.OPEN);
        startLagPingPong(config);
    };
    channel.onclose = () => {
        logger.debug(`data-channel-${channel.id}:`, 'close');
        act(ACTIONS.CLOSE);
        channel.onerror = channel.onmessage = null;
        channels.delete(channel);
        if (channels.size === 0)
            stopLagPingPong();
    };
    channel.onerror = error => {
        if (error.error.message === 'Transport channel closed')
            return;
        logger.error(`data-channel-${channel.id}:`, error);
        act(ACTIONS.ERROR, [error]);
    };
    channel.onmessage = msg => {
        const { action, attrs } = JSON.parse(msg.data);
        act(action, attrs);
    };
}
let lagPing;
function startLagPingPong(config) {
    function ping() {
        send(ACTIONS.PING, Date.now());
        lagPing = setTimeout(ping, config.lagInterval);
    }
    ping();
}
function stopLagPingPong() {
    clearTimeout(lagPing);
    lagPing = null;
}
const defaultConfig = {
    lagInterval: 3000,
    debugLog: false,
    fastButUnreliable: true
};
let logger = buildLogger(true);
function buildLogger(debugLog) {
    return debugLog ? console : {
        log: console.log,
        error: console.error,
        debug: () => { }
    };
}
export function connect(url, config = defaultConfig) {
    const socket = io.connect(url, { transports: ['websocket'] });
    let peer;
    logger = buildLogger(config.debugLog);
    socket.on('connect', () => {
        if (peer)
            closePeer(peer, socket);
        peer = buildPeer(socket, config);
    });
    socket.on('disconnect', () => {
        if (peer)
            closePeer(peer, socket);
        peer = null;
    });
    socket.on('connect_error', (error) => act(ACTIONS.ERROR, [error]));
    socket.on('connect_timeout', (error) => act(ACTIONS.ERROR, [error]));
    return disconnect.bind({}, socket);
}
function disconnect(socket) {
    socket && socket.close();
    socket.off('connect');
    socket.off('connect_error');
    socket.off('connect_timeout');
    socket.off('disconnect');
}
export function send(action, ...attrs) {
    channels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ action, attrs }));
        }
        else {
            logger.error(`could not send to a ${channel.readyState} channel`, action);
        }
    });
}
//# sourceMappingURL=transport.mjs.map
