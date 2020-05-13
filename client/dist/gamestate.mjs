import { on } from './actions.mjs';
export var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE["INIT"] = "gamestate-init";
    GAMESTATE["UPDATE"] = "gamestate-update";
})(GAMESTATE || (GAMESTATE = {}));
let current = {
    clients: [],
    lagStatistics: {}
};
on(GAMESTATE.INIT, (newState) => {
    current = newState;
});
on(GAMESTATE.UPDATE, (newState) => {
    current = newState;
});
export function state() {
    return current;
}
//# sourceMappingURL=gamestate.mjs.map
