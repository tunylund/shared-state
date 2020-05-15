import { Action } from './actions';
export declare type ID = string;
export interface Config {
    iceServers?: {}[];
    peerTimeout: number;
    debugLog: boolean;
    fastButUnreliable: boolean;
}
export declare function start(httpServerOrPort: any, initialState: {}, onConnect: (id: ID) => any, config?: Config): void;
export declare function stop(): void;
export declare function send(id: ID, action: Action, ...attrs: any): void;
export declare function broadcast(action: Action, ...attrs: any): void;
export declare function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any): void;
