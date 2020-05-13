"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_1 = require("./transport");
const deep_diff_1 = require("deep-diff");
var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE["INIT"] = "gamestate-init";
    GAMESTATE["UPDATE"] = "gamestate-update";
})(GAMESTATE = exports.GAMESTATE || (exports.GAMESTATE = {}));
let current = {
    clients: [],
    lagStatistics: {}
};
function state() {
    return current;
}
exports.state = state;
function init(state) {
    current = JSON.parse(JSON.stringify(state));
    current.clients = [];
    current.lagStatistics = {};
    transport_1.broadcast(GAMESTATE.INIT, current);
}
exports.init = init;
function update(state) {
    var _a;
    state.clients = current.clients;
    state.lagStatistics = current.lagStatistics;
    (_a = deep_diff_1.diff(current, state)) === null || _a === void 0 ? void 0 : _a.map(d => {
        deep_diff_1.applyChange(current, state, d);
    });
    transport_1.broadcast(GAMESTATE.UPDATE, current);
}
exports.update = update;
function updateLag(id, lag) {
    current.lagStatistics[id] = lag;
    transport_1.send(id, GAMESTATE.UPDATE, current);
}
exports.updateLag = updateLag;
function addClient(id) {
    current.clients.push(id);
    current.lagStatistics[id] = Infinity;
    transport_1.send(id, GAMESTATE.INIT, current);
    update(current);
}
exports.addClient = addClient;
function removeClient(id) {
    current.clients.splice(current.clients.indexOf(id), 1);
    delete current.lagStatistics[id];
    update(current);
}
exports.removeClient = removeClient;
