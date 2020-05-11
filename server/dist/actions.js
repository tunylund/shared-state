"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions = new Map();
const emptySet = new Set();
exports.OPEN = 'open';
exports.CLOSE = 'open';
exports.ERROR = 'open';
function act(id, action, ...attrs) {
    var _a;
    for (let fn of ((_a = actions.get(id)) === null || _a === void 0 ? void 0 : _a.get(action)) || emptySet) {
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
    var _a, _b, _c;
    if (action && fn)
        (_b = (_a = actions.get(id)) === null || _a === void 0 ? void 0 : _a.get(action)) === null || _b === void 0 ? void 0 : _b.delete(fn);
    else if (action)
        (_c = actions.get(id)) === null || _c === void 0 ? void 0 : _c.delete(action);
    else
        actions.delete(id);
}
exports.off = off;
