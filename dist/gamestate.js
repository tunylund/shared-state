"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_1 = require("./transport");
const deep_diff_1 = require("deep-diff");
var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE["INIT"] = "gamestate-init";
    GAMESTATE["UPDATE"] = "gamestate-update";
})(GAMESTATE = exports.GAMESTATE || (exports.GAMESTATE = {}));
let current = {};
function init(state = {}) {
    current = JSON.parse(JSON.stringify(state));
    transport_1.broadcast(GAMESTATE.INIT, current);
}
exports.init = init;
function update(state = {}) {
    var _a;
    const target = {};
    (_a = deep_diff_1.diff(current, state)) === null || _a === void 0 ? void 0 : _a.map(d => deep_diff_1.applyChange(target, state, d));
    transport_1.broadcast(GAMESTATE.UPDATE, target);
}
exports.update = update;
