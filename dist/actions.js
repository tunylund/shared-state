"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions = new Map();
const emptySet = new Set();
exports.OPEN = 'open';
exports.CLOSE = 'open';
exports.ERROR = 'open';
function act(id, action, ...attrs) {
    for (let fn of actions.get(id)?.get(action) || emptySet) {
        try {
            fn(...attrs);
        }
        catch (err) {
            console.error(id, err);
        }
    }
}
exports.act = act;
function on(id, action, fn) {
    const accs = actions.get(id) || new Map();
    const fns = accs.get(action) || new Set();
    actions.set(id, accs);
    accs.set(action, fns);
    fns.add(fn);
}
exports.on = on;
function off(id, action, fn) {
    if (action && fn)
        actions.get(id)?.get(action)?.delete(fn);
    else if (action)
        actions.get(id)?.delete(action);
    else
        actions.delete(id);
}
exports.off = off;
