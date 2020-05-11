import { Action } from './actions';
export declare type ID = string;
export interface Config {
    iceServers?: {}[];
    peerTimeout: number;
}
export declare function start(httpServerOrPort: any, gameState: {}, onConnect: (id: ID) => void, config?: Config): void;
export declare function stop(): void;
export declare function send(id: ID, action: Action, ...attrs: any): void;
export declare function broadcast(action: Action, ...attrs: any): void;
export declare function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any): void;
