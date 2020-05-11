declare type Action = string;
export declare enum ACTIONS {
    INIT = "init",
    OPEN = "open",
    CLOSE = "close",
    ERROR = "error"
}
export declare function act(action: Action, attrs?: any[]): void;
export declare function on(ev: Action, fn: Function): void;
export declare function off(ev: Action, fn?: Function | null): void;
export {};