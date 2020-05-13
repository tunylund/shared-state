interface Config {
    lagInterval: number;
}
export declare function connect(url: string, config?: Config): () => void;
export declare function send(action: string, ...attrs: any[]): void;
export {};
