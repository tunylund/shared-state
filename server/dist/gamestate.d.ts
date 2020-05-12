import { ID } from "./transport";
export declare enum GAMESTATE {
    INIT = "gamestate-init",
    UPDATE = "gamestate-update"
}
export interface State {
    clients: ID[];
    [key: string]: any;
}
export declare function state(): State;
export declare function init(state: Partial<State>): void;
export declare function update(state: Partial<State>): void;
export declare function addClient(id: ID): void;
export declare function removeClient(id: ID): void;
