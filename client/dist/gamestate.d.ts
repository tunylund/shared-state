export declare enum GAMESTATE {
    INIT = "gamestate-init",
    UPDATE = "gamestate-update"
}
export declare type ID = string;
export interface State {
    clients: ID[];
    lagStatistics: {
        [id: string]: number;
    };
}
export declare function state<T extends State>(): T;
