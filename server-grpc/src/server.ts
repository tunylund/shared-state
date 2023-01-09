import grpc, { CallContext, ServerMiddlewareCall } from 'nice-grpc';
import { SharedStateServiceDefinition } from './shared-state';
import logger from './logger';
import abortController from 'abort-controller-x';
import serviceFactory from './service';
import { init } from './state';

let server: grpc.Server

export async function start(port: number, initialState: {}, onConnect: (id: string) => any) {
  server = grpc.createServer()//.use(loggingMiddleware)
  server.add(SharedStateServiceDefinition, serviceFactory(onConnect));
  init(initialState)
  await server.listen(`0.0.0.0:${port}`);
}

export async function stop() {
  await server.shutdown()
}

// async function* loggingMiddleware<Request, Response>(
//   call: ServerMiddlewareCall<Request, Response>,
//   context: CallContext,
// ) {
//   const {path} = call.method;

  
//   logger.log('Server call', path, 'start');

//   try {
//     const result = yield* call.next(call.request, context);

//     logger.log('Server call', path, 'end: OK');

//     return result;
//   } catch (error) {
//     if (error instanceof grpc.ServerError) {
//       logger.log(
//         'Server call',
//         path,
//         `end: ${grpc.Status[error.code]}: ${error.details}`,
//       );
//     } else if (abortController.isAbortError(error)) {
//       logger.log('Server call', path, 'cancel');
//     } else {
//       logger.log('Server call', path, `error: ${error}`);
//     }

//     throw error;
//   }
// }