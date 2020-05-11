const actions = new Map();
export var ACTIONS;
(function (ACTIONS) {
    ACTIONS["INIT"] = "init";
    ACTIONS["OPEN"] = "open";
    ACTIONS["CLOSE"] = "close";
    ACTIONS["ERROR"] = "error";
})(ACTIONS || (ACTIONS = {}));
export function act(action, attrs = []) {
    var _a;
    try {
        (_a = actions.get(action)) === null || _a === void 0 ? void 0 : _a.forEach(fn => fn(...attrs));
    }
    catch (err) {
        console.error(err);
    }
}
export function on(ev, fn) {
    var _a;
    if (!actions.has(ev))
        actions.set(ev, new Set());
    (_a = actions.get(ev)) === null || _a === void 0 ? void 0 : _a.add(fn);
}
export function off(ev, fn = null) {
    var _a;
    if (fn)
        (_a = actions.get(ev)) === null || _a === void 0 ? void 0 : _a.delete(fn);
    else
        actions.delete(ev);
}
//# sourceMappingURL=actions.js.map