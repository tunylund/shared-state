import { ChildProcess } from "child_process"

export interface InterProcessMessage { method: string, params?: any }

export function sendToChildProcess<T>(target: ChildProcess, message: InterProcessMessage): Promise<T> {
  return new Promise(resolve => {
    const resolveResponse = (messageFromChildProcess: InterProcessMessage) => {
      if (messageFromChildProcess.method === message.method) {
        target.off('message', resolveResponse)
        resolve(messageFromChildProcess.params)
      }
    }
    target.on('message', resolveResponse)
    target.send(message)
  })
}

export function waitForSpecificAction(target: ChildProcess, expectedAction: string, ...expectedArguments: any[]): Promise<any> {
  return new Promise(resolve => {
    const resolveResponse = async ({method, params}: InterProcessMessage) => {
      if (method == 'actionTriggered') {
        if (params && params.action === expectedAction) {
          if (expectedArguments.every(expectedArgument => params.args?.includes(expectedArgument))) {
            target.off('message', resolveResponse)
            resolve(params.args)
          }
        }
      }
    }
    target.on('message', resolveResponse)
  })
}

export function sendToParentProcess(message: InterProcessMessage) {
  if (process.send) process.send(message)
  else console.log(message)
}

export function listenToMessagesFromParentProcess(listeners: Record<string, (params?: any) => any>) {
  process.on('message', async (msg: InterProcessMessage) => {
    if (msg.method in listeners) {
      const result = await listeners[msg.method](msg.params)
      sendToParentProcess({ method: msg.method, params: result })
    } else {
      throw new Error('Unrecognized method call from parent process: ' + msg.method)
    }
  })
}

export function passActionsToParentProcess(actions: string[], on: (action: string, ...args: any[]) => void) {
  actions.map((action) => {
    on(action, (...args: any[]) => {
      sendToParentProcess({ method: 'actionTriggered', params: { action, args } })
    })
  })
}
