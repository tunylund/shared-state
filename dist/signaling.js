"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const transport_1 = require("./transport");
let signalingServer = null;
function start(httpServer, onConnect, config) {
    if (signalingServer)
        close();
    signalingServer = socket_io_1.default(httpServer, { transports: ['websocket'] });
    signalingServer.on('connection', signalingSocket => {
        const id = transport_1.buildPeer(signalingSocket, config);
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
