"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_1 = require("./transport");
const deep_diff_1 = require("deep-diff");
var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE["INIT"] = "gamestate-init";
    GAMESTATE["UPDATE"] = "gamestate-update";
})(GAMESTATE = exports.GAMESTATE || (exports.GAMESTATE = {}));
let current = { clients: [] };
function state() {
    return current;
}
exports.state = state;
function init(state) {
    current = JSON.parse(JSON.stringify(Object.assign({ clients: [] }, state)));
    transport_1.broadcast(GAMESTATE.INIT, current);
}
exports.init = init;
function update(state) {
    var _a;
    state.clients = current.clients;
    (_a = deep_diff_1.diff(current, state)) === null || _a === void 0 ? void 0 : _a.map(d => {
        deep_diff_1.applyChange(current, state, d);
    });
    transport_1.broadcast(GAMESTATE.UPDATE, current);
}
exports.update = update;
function addClient(id) {
    current.clients.push(id);
    transport_1.send(id, GAMESTATE.INIT, current);
    update(current);
}
exports.addClient = addClient;
function removeClient(id) {
    current.clients.splice(current.clients.indexOf(id), 1);
    update(current);
}
exports.removeClient = removeClient;
