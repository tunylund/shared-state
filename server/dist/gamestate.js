import { broadcast, send } from './transport.js';
import deedDiff from 'deep-diff';
const { diff, applyChange } = deedDiff;
export var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE["INIT"] = "gamestate-init";
    GAMESTATE["UPDATE"] = "gamestate-update";
})(GAMESTATE || (GAMESTATE = {}));
let current = {
    clients: [],
    lagStatistics: {}
};
export function state() {
    return current;
}
export function init(state) {
    current = JSON.parse(JSON.stringify(state));
    current.clients = [];
    current.lagStatistics = {};
    broadcast(GAMESTATE.INIT, current);
}
export function update(state) {
    state.clients = current.clients;
    state.lagStatistics = current.lagStatistics;
    diff(current, state)?.map(d => {
        applyChange(current, state, d);
    });
    broadcast(GAMESTATE.UPDATE, current);
}
export function updateLag(id, lag) {
    current.lagStatistics[id] = lag;
    send(id, GAMESTATE.UPDATE, current);
}
export function addClient(id) {
    current.clients.push(id);
    current.lagStatistics[id] = Infinity;
    send(id, GAMESTATE.INIT, current);
    update(current);
}
export function removeClient(id) {
    current.clients.splice(current.clients.indexOf(id), 1);
    delete current.lagStatistics[id];
    update(current);
}
