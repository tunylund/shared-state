import { ID } from './transport';
export declare type Action = string;
export declare const OPEN = "open";
export declare const CLOSE = "open";
export declare const ERROR = "open";
export declare function act(id: ID, action: Action, ...attrs: any[]): void;
export declare function on(id: ID, action: Action, fn: Function): void;
export declare function off(id: ID, action?: Action, fn?: Function): void;
