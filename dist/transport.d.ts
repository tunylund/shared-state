import { Socket } from 'socket.io';
import { Action } from './actions';
export declare type ID = string;
export interface Config {
    iceServers?: {}[];
    peerTimeout: number;
}
export declare function buildPeer(signalingSocket: Socket, config?: Config): ID;
export declare function send(id: ID, action: Action, ...attrs: any): void;
export declare function broadcast(action: Action, ...attrs: any): void;
export declare function broadcastToOthers(notThisId: ID, action: Action, ...attrs: any): void;
