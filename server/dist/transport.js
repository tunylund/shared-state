import socketIO from 'socket.io';
import { v4 as uuid } from 'uuid';
import { on, off, act, ACTIONS } from './actions.js';
import { init, updateLag, addClient, removeClient } from './gamestate.js';
// @ts-ignore
import wrtc from 'wrtc';
const { RTCPeerConnection } = wrtc;
const defaultConfig = {
    iceServers: [],
    peerTimeout: 10000,
    debugLog: false
};
const channels = new Map();
let signalingServer = null;
let logger = buildLogger(true);
function buildLogger(debugLog) {
    return debugLog ? console : {
        log: console.log,
        error: console.error,
        debug: () => { }
    };
}
export function start(httpServerOrPort, gameState, onConnect, config = defaultConfig) {
    if (signalingServer)
        close();
    init(Object.assign({ clients: [], ...gameState }));
    logger = buildLogger(config.debugLog);
    signalingServer = socketIO(httpServerOrPort, { transports: ['websocket'] });
    signalingServer.on('connection', signalingSocket => {
        const id = buildPeer(signalingSocket, config);
        onConnect(id);
    });
}
export function stop() {
    if (signalingServer) {
        signalingServer.close();
        signalingServer = null;
    }
}
function buildPeer(signalingSocket, config) {
    const id = uuid();
    const peer = new RTCPeerConnection({ iceServers: config.iceServers });
    logger.debug(id, 'build a peer');
    peer.onnegotiationneeded = async () => {
        try {
            const offer = await peer.createOffer();
            peer.setLocalDescription(offer);
            signalingSocket.emit('signal', { description: offer });
            logger.debug(id, 'signal:', 'provided an offer');
        }
        catch (err) {
            logger.error(id, 'signal', err);
        }
    };
    function destroy(reason) {
        peer.onnegotiationneeded = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.oniceconnectionstatechange = null;
        peer.onsignalingstatechange = null;
        peer.ondatachannel = null;
        signalingSocket.off('signal', onSignal);
        signalingSocket.off('disconnect', onDisconnect);
        signalingSocket.disconnect(true);
        act(id, ACTIONS.CLOSE);
        channels.delete(id);
        off(id);
        peer.close();
        logger.debug(id, `closed the peer: ${reason}`);
    }
    peer.onicecandidate = ({ candidate }) => signalingSocket.emit('signal', { candidate });
    peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'disconnected')
            destroy('iceConnectionState is disconnected');
        if (peer.iceConnectionState === 'closed')
            destroy('iceConnectionState is closed');
        if (peer.iceConnectionState === 'failed')
            peer.restartIce();
    };
    peer.onconnectionstatechange = () => { if (peer.connectionState === 'closed')
        destroy('connectionState is closed'); };
    peer.onsignalingstatechange = () => { if (peer.signalingState === 'closed')
        destroy('signalingState is closed'); };
    setTimeout(() => {
        if (peer.connectionState === 'new') {
            destroy('timeout establishing a peer connection');
        }
    }, config.peerTimeout);
    const onSignal = (msg) => handleSignal(id, peer, msg);
    const onDisconnect = () => destroy('signaling socket disconnected');
    signalingSocket.on('signal', onSignal);
    signalingSocket.on('disconnect', onDisconnect);
    signalingSocket.emit('signal', { id });
    buildChannel(id, peer);
    return id;
}
async function handleSignal(id, peer, msg) {
    const { description, candidate } = msg;
    try {
        if (description && description.type === 'answer') {
            await peer.setRemoteDescription(description);
            logger.debug(id, 'signal:', `accepted a remote ${description.type}`);
        }
        else if (candidate) {
            if (peer.remoteDescription && candidate.candidate) {
                await peer.addIceCandidate(candidate);
            }
        }
    }
    catch (err) {
        logger.error(id, err);
    }
}
function buildChannel(id, peer) {
    const channel = peer.createDataChannel('data-channel', { negotiated: true, id: 0 });
    channels.set(id, channels.get(id) || new Set());
    channel.onopen = () => {
        logger.debug(id, `data-channel:`, 'open');
        for (let ch of channels.get(id) || []) {
            ch.close();
        }
        channels.get(id)?.add(channel);
        addClient(id);
        act(id, ACTIONS.OPEN);
        on(id, ACTIONS.PING, (theirTime) => {
            updateLag(id, Date.now() - theirTime);
        });
    };
    channel.onclose = () => {
        logger.debug(id, `data-channel:`, 'close');
        channel.onerror = channel.onmessage = null;
        channels.get(id)?.delete(channel);
        removeClient(id);
        act(id, ACTIONS.CLOSE);
    };
    channel.onerror = error => {
        if (error.error.message === 'Transport channel closed')
            return;
        logger.error(id, `data-channel:`, error);
        act(id, ACTIONS.ERROR, error);
    };
    channel.onmessage = msg => {
        const { action, attrs } = JSON.parse(msg.data);
        logger.debug(id, `data-channel:`, action);
        act(id, action, ...(attrs || []));
    };
}
export function send(id, action, ...attrs) {
    channels.get(id)?.forEach(channel => {
        if (channel.readyState === 'open') {
            logger.debug(id, 'send', action);
            channel.send(JSON.stringify({ action, attrs }));
        }
        else {
            logger.error(id, `could not send to a '${channel.readyState}' channel`, action);
        }
    });
}
export function broadcast(action, ...attrs) {
    for (let id of channels.keys()) {
        send(id, action, ...attrs);
    }
}
export function broadcastToOthers(notThisId, action, ...attrs) {
    for (let id of channels.keys()) {
        if (id !== notThisId)
            send(id, action, ...attrs);
    }
}
