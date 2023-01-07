/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

export interface PingRequest {
  clientTime: number;
}

export interface Void {
}

export interface ConnectResponse {
  id: string;
}

export interface MessageRequest {
  action: string;
  attrs: string;
}

export interface Update {
  action: string;
  attrs: string;
}

function createBasePingRequest(): PingRequest {
  return { clientTime: 0 };
}

export const PingRequest = {
  encode(message: PingRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.clientTime !== 0) {
      writer.uint32(8).int32(message.clientTime);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PingRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePingRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientTime = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PingRequest {
    return { clientTime: isSet(object.clientTime) ? Number(object.clientTime) : 0 };
  },

  toJSON(message: PingRequest): unknown {
    const obj: any = {};
    message.clientTime !== undefined && (obj.clientTime = Math.round(message.clientTime));
    return obj;
  },

  fromPartial(object: DeepPartial<PingRequest>): PingRequest {
    const message = createBasePingRequest();
    message.clientTime = object.clientTime ?? 0;
    return message;
  },
};

function createBaseVoid(): Void {
  return {};
}

export const Void = {
  encode(_: Void, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Void {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVoid();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): Void {
    return {};
  },

  toJSON(_: Void): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<Void>): Void {
    const message = createBaseVoid();
    return message;
  },
};

function createBaseConnectResponse(): ConnectResponse {
  return { id: "" };
}

export const ConnectResponse = {
  encode(message: ConnectResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ConnectResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConnectResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ConnectResponse {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: ConnectResponse): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  fromPartial(object: DeepPartial<ConnectResponse>): ConnectResponse {
    const message = createBaseConnectResponse();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseMessageRequest(): MessageRequest {
  return { action: "", attrs: "" };
}

export const MessageRequest = {
  encode(message: MessageRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.action !== "") {
      writer.uint32(10).string(message.action);
    }
    if (message.attrs !== "") {
      writer.uint32(18).string(message.attrs);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MessageRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessageRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.action = reader.string();
          break;
        case 2:
          message.attrs = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MessageRequest {
    return {
      action: isSet(object.action) ? String(object.action) : "",
      attrs: isSet(object.attrs) ? String(object.attrs) : "",
    };
  },

  toJSON(message: MessageRequest): unknown {
    const obj: any = {};
    message.action !== undefined && (obj.action = message.action);
    message.attrs !== undefined && (obj.attrs = message.attrs);
    return obj;
  },

  fromPartial(object: DeepPartial<MessageRequest>): MessageRequest {
    const message = createBaseMessageRequest();
    message.action = object.action ?? "";
    message.attrs = object.attrs ?? "";
    return message;
  },
};

function createBaseUpdate(): Update {
  return { action: "", attrs: "" };
}

export const Update = {
  encode(message: Update, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.action !== "") {
      writer.uint32(10).string(message.action);
    }
    if (message.attrs !== "") {
      writer.uint32(18).string(message.attrs);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Update {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUpdate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.action = reader.string();
          break;
        case 2:
          message.attrs = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Update {
    return {
      action: isSet(object.action) ? String(object.action) : "",
      attrs: isSet(object.attrs) ? String(object.attrs) : "",
    };
  },

  toJSON(message: Update): unknown {
    const obj: any = {};
    message.action !== undefined && (obj.action = message.action);
    message.attrs !== undefined && (obj.attrs = message.attrs);
    return obj;
  },

  fromPartial(object: DeepPartial<Update>): Update {
    const message = createBaseUpdate();
    message.action = object.action ?? "";
    message.attrs = object.attrs ?? "";
    return message;
  },
};

export type SharedStateServiceDefinition = typeof SharedStateServiceDefinition;
export const SharedStateServiceDefinition = {
  name: "SharedStateService",
  fullName: "SharedStateService",
  methods: {
    ping: {
      name: "ping",
      requestType: PingRequest,
      requestStream: false,
      responseType: Void,
      responseStream: false,
      options: {},
    },
    connect: {
      name: "connect",
      requestType: Void,
      requestStream: false,
      responseType: ConnectResponse,
      responseStream: false,
      options: {},
    },
    send: {
      name: "send",
      requestType: MessageRequest,
      requestStream: false,
      responseType: Void,
      responseStream: false,
      options: {},
    },
    listen: {
      name: "listen",
      requestType: Void,
      requestStream: false,
      responseType: Update,
      responseStream: true,
      options: {},
    },
  },
} as const;

export interface SharedStateServiceImplementation<CallContextExt = {}> {
  ping(request: PingRequest, context: CallContext & CallContextExt): Promise<DeepPartial<Void>>;
  connect(request: Void, context: CallContext & CallContextExt): Promise<DeepPartial<ConnectResponse>>;
  send(request: MessageRequest, context: CallContext & CallContextExt): Promise<DeepPartial<Void>>;
  listen(request: Void, context: CallContext & CallContextExt): ServerStreamingMethodResult<DeepPartial<Update>>;
}

export interface SharedStateServiceClient<CallOptionsExt = {}> {
  ping(request: DeepPartial<PingRequest>, options?: CallOptions & CallOptionsExt): Promise<Void>;
  connect(request: DeepPartial<Void>, options?: CallOptions & CallOptionsExt): Promise<ConnectResponse>;
  send(request: DeepPartial<MessageRequest>, options?: CallOptions & CallOptionsExt): Promise<Void>;
  listen(request: DeepPartial<Void>, options?: CallOptions & CallOptionsExt): AsyncIterable<Update>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export type ServerStreamingMethodResult<Response> = { [Symbol.asyncIterator](): AsyncIterator<Response, void> };
