export declare enum GAMESTATE {
    INIT = "gamestate-init",
    UPDATE = "gamestate-update"
}
declare type ID = string;
export interface State {
    clients: ID[];
    [key: string]: any;
}
export declare function state(): State;
export {};
