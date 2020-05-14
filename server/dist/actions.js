const actions = new Map();
const emptySet = new Set();
export var ACTIONS;
(function (ACTIONS) {
    ACTIONS["OPEN"] = "open";
    ACTIONS["CLOSE"] = "close";
    ACTIONS["ERROR"] = "error";
    ACTIONS["PING"] = "ping";
    ACTIONS["INIT"] = "state-init";
    ACTIONS["UPDATE"] = "state-update";
})(ACTIONS || (ACTIONS = {}));
export function act(id, action, ...attrs) {
    for (let fn of actions.get(id)?.get(action) || emptySet) {
        try {
            fn(...attrs);
        }
        catch (err) {
            console.error(id, err);
        }
    }
}
export function on(id, action, fn) {
    const accs = actions.get(id) || new Map();
    const fns = accs.get(action) || new Set();
    actions.set(id, accs);
    accs.set(action, fns);
    fns.add(fn);
}
export function off(id, action, fn) {
    if (action && fn)
        actions.get(id)?.get(action)?.delete(fn);
    else if (action)
        actions.get(id)?.delete(action);
    else
        actions.delete(id);
}
