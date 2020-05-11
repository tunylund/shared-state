import { ID } from "./transport";
export declare enum GAMESTATE {
    INIT = "gamestate-init",
    UPDATE = "gamestate-update"
}
interface GameState {
    clients: ID[];
    [key: string]: any;
}
export declare function state(): GameState;
export declare function init(state: GameState): void;
export declare function update(state: GameState): void;
export declare function addClient(id: ID): void;
export declare function removeClient(id: ID): void;
export {};
