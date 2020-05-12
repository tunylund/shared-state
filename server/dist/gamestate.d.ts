import { ID } from "./transport";
export declare enum GAMESTATE {
    INIT = "gamestate-init",
    UPDATE = "gamestate-update"
}
export interface State {
    clients: ID[];
    [key: string]: any;
}
export declare function state<T extends State>(): T;
export declare function init<T extends State>(state: Partial<T>): void;
export declare function update<T extends State>(state: Partial<State>): void;
export declare function addClient(id: ID): void;
export declare function removeClient(id: ID): void;
