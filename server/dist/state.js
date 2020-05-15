import { broadcast, send } from './transport.js';
import deedDiff from 'deep-diff';
import { ACTIONS } from './actions.js';
const { diff, applyChange } = deedDiff;
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
    broadcast(ACTIONS.STATE_INIT, current);
}
export function update(state) {
    state.clients = current.clients;
    state.lagStatistics = current.lagStatistics;
    diff(current, state)?.map(d => {
        applyChange(current, state, d);
    });
    broadcast(ACTIONS.STATE_UPDATE, current);
}
export function updateLag(id, lag) {
    current.lagStatistics[id] = lag;
    send(id, ACTIONS.STATE_UPDATE, current);
}
export function addClient(id) {
    current.clients.push(id);
    current.lagStatistics[id] = Infinity;
    send(id, ACTIONS.STATE_INIT, current);
    update(current);
}
export function removeClient(id) {
    current.clients.splice(current.clients.indexOf(id), 1);
    delete current.lagStatistics[id];
    update(current);
}
