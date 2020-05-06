/// <reference types="node" />
import { Server } from 'http';
import { ID, Config } from './transport';
export declare function start(httpServer: Server, onConnect: (id: ID) => void, config?: Config): void;
export declare function stop(): void;
