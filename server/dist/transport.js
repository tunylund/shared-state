"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const uuid_1 = require("uuid");
// @ts-ignore
const wrtc_1 = require("wrtc");
const actions_1 = require("./actions");
const gamestate_1 = require("./gamestate");
const gamestate_2 = require("./gamestate");
const _1 = require(".");
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
function start(httpServerOrPort, gameState, onConnect, config = defaultConfig) {
    if (signalingServer)
        close();
    gamestate_2.init(Object.assign({ clients: [], ...gameState }));
    logger = buildLogger(config.debugLog);
    signalingServer = socket_io_1.default(httpServerOrPort, { transports: ['websocket'] });
    signalingServer.on('connection', signalingSocket => {
        const id = buildPeer(signalingSocket, config);
        onConnect(id);
    });
}
exports.start = start;
function stop() {
    if (signalingServer) {
        signalingServer.close();
        signalingServer = null;
    }
}
exports.stop = stop;
function buildPeer(signalingSocket, config) {
    const id = uuid_1.v4();
    const peer = new wrtc_1.RTCPeerConnection({ iceServers: config.iceServers });
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
        actions_1.act(id, actions_1.ACTIONS.CLOSE);
        channels.delete(id);
        actions_1.off(id);
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
        var _a;
        logger.debug(id, `data-channel:`, 'open');
        for (let ch of channels.get(id) || []) {
            ch.close();
        }
        (_a = channels.get(id)) === null || _a === void 0 ? void 0 : _a.add(channel);
        gamestate_1.addClient(id);
        actions_1.act(id, actions_1.ACTIONS.OPEN);
        _1.on(id, actions_1.ACTIONS.PING, (theirTime) => {
            gamestate_2.updateLag(id, Date.now() - theirTime);
        });
    };
    channel.onclose = () => {
        var _a;
        logger.debug(id, `data-channel:`, 'close');
        channel.onerror = channel.onmessage = null;
        (_a = channels.get(id)) === null || _a === void 0 ? void 0 : _a.delete(channel);
        gamestate_1.removeClient(id);
        actions_1.act(id, actions_1.ACTIONS.CLOSE);
    };
    channel.onerror = error => {
        if (error.error.message === 'Transport channel closed')
            return;
        logger.error(id, `data-channel:`, error);
        actions_1.act(id, actions_1.ACTIONS.ERROR, error);
    };
    channel.onmessage = msg => {
        const { action, attrs } = JSON.parse(msg.data);
        logger.debug(id, `data-channel:`, action);
        actions_1.act(id, action, ...(attrs || []));
    };
}
function send(id, action, ...attrs) {
    var _a;
    (_a = channels.get(id)) === null || _a === void 0 ? void 0 : _a.forEach(channel => {
        if (channel.readyState === 'open') {
            logger.debug(id, 'send', action);
            channel.send(JSON.stringify({ action, attrs }));
        }
        else {
            logger.error(id, `could not send to a '${channel.readyState}' channel`, action);
        }
    });
}
exports.send = send;
function broadcast(action, ...attrs) {
    for (let id of channels.keys()) {
        send(id, action, ...attrs);
    }
}
exports.broadcast = broadcast;
function broadcastToOthers(notThisId, action, ...attrs) {
    for (let id of channels.keys()) {
        if (id !== notThisId)
            send(id, action, ...attrs);
    }
}
exports.broadcastToOthers = broadcastToOthers;
