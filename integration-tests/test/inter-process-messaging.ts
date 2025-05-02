import { ChildProcess, spawn } from "child_process"

export interface InterProcessMessage { method: string, params?: any }

export function spawnChildProcessWithAnApi<T>(script: string, args: string): Promise<[ChildProcess, T, any]> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('tsx', [script, args], { stdio: ['ipc'] })
    childProcess.stdout?.pipe(process.stdout)
    childProcess.stderr?.pipe(process.stderr)
    childProcess.on('error', reject)
    childProcess.on('close', reject)

    childProcess.once('message', (params: any) => {
      const proxy = buildChildProcessProxy<T>(childProcess)
      resolve([childProcess, proxy, params])
    })
  })
}

function buildChildProcessProxy<T>(target: ChildProcess): T {
  return new Proxy({}, {
    get(_, method: string) {
      return function (...args: any[]) {
        return sendToChildProcess(target, { method, params: args })
      }
    }
  }) as T
}

function sendToChildProcess<T>(target: ChildProcess, message: InterProcessMessage): Promise<T> {
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

export function registerChildProcessApi<T extends Record<string, (...params: any) => Promise<any>>>(api: T) {
  process.on('message', async (msg: InterProcessMessage) => {
    if (msg.method in api) {
      const result = await api[msg.method](...msg.params)
      sendToParentProcess({ method: msg.method, params: result })
    } else {
      throw new Error('Unrecognized method call from parent process: ' + msg.method)
    }
  })
}

function sendToParentProcess(message: InterProcessMessage) {
  if (process.send) process.send(message)
  else console.log(message)
}
