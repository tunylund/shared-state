import { on, ACTIONS } from "./actions";
let current = {
    clients: [],
    lagStatistics: {}
};
on(ACTIONS.STATE_INIT, (newState) => {
    current = newState;
});
on(ACTIONS.STATE_UPDATE, (newState) => {
    current = newState;
});
export function state() {
    return current;
}
//# sourceMappingURL=state.js.map