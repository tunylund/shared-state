import { ChildProcess, Serializable } from 'child_process'
import { spawnChildProcessWithAnApi, InterProcessMessage } from './inter-process-messaging.ts'

interface State { state: string}

export interface ServerProcessApi {
  listClients: () => Promise<any[]>
  send: (clientId: string, action: string, ...args: any[]) => Promise<any>
  broadcast: (action: string, ...args: any[]) => Promise<any>
  setState: (state: any) => Promise<any>
  disconnect: () => Promise<void>
  getState: () => Promise<any>
  getMetrics: (clientId: string) => Promise<any>
  waitForAction: (action: string, ...expectedArgs: any[]) => Promise<any>
  [key: string]: (...args: any[]) => Promise<any>
}

export interface ClientProcessApi {
  connect: () => Promise<string>
  disconnect: () => Promise<void>
  getId: () => Promise<string>
  getState: () => Promise<State>
  getMetrics: () => Promise<Serializable>
  waitForAction: (action: string, ...expectedArgs: any[]) => Promise<any>
  [key: string]: (...args: any[]) => Promise<any>
}

describe('integration-tests', () => {
  
  let port: number,
      serverProcess: ChildProcess,
      clientProcess: ChildProcess,
      server: ServerProcessApi,
      client: ClientProcessApi

  function close(target: ChildProcess): Promise<any> {
    return new Promise(resolve => {
      if (target && target.connected) {
        target.on('exit', () => resolve(0))
        target.kill()
      } else resolve(0)
    })
  }

  beforeEach(async () => {
    [serverProcess, server, port] = await spawnChildProcessWithAnApi<ServerProcessApi>('./test/integration-test-server.ts', `state=${JSON.stringify({state: 'initial'})}`);
    [clientProcess, client] = await spawnChildProcessWithAnApi<ClientProcessApi>('./test/integration-test-client.ts', `port=${port}`);
  })

  afterEach(async () => {
    await close(clientProcess)
    await close(serverProcess)
  })

  function pauseClientProcess() {
    clientProcess.kill('SIGSTOP')
  }

  function unpauseClientProcess() {
    clientProcess.kill('SIGCONT')
  }

  const wait = () => new Promise(resolve => setTimeout(resolve, 300))
  
  describe('connected and disconnected events', () => {

    it('should trigger an action when a client opens connection ', async () => {
      const expectedEvents = [
        server.waitForAction('connected'),
        client.waitForAction('connected')
      ]
      const id = await client.connect()
      expect(await Promise.all(expectedEvents)).toMatchObject([[id], [id]])
    })

    it('should provide an id and initial state when a client opens a connection', async () => {
      await client.connect()
      expect(await client.getId()).toBeDefined()
      expect(await client.getState()).toMatchObject({state: 'initial'})
    })

    it('should maintain knowledge of which clients have joined', async () => {
      await client.connect()
      expect(await server.listClients()).toHaveLength(1)
      await client.disconnect()
      expect(await server.listClients()).toHaveLength(0)
    })
  
    it('should trigger an action when a client closes connection', async () => {
      const id = await client.connect()
      const expectedEvents = [
        server.waitForAction('disconnected', id),
        client.waitForAction('disconnected')
      ]
      await client.disconnect()
      await Promise.all(expectedEvents)
    })

    it('should trigger an action when the server closes the connection', async () => {
      const id = await client.connect()
      const expectedEvents = [
        server.waitForAction('disconnected', id),
        client.waitForAction('disconnected')
      ]
      await server.disconnect()
      await Promise.all(expectedEvents)
    })
  })

  describe("state management", () => {
    beforeEach(() => client.connect())

    it('should be able to send messages to clients', async () => {
      await Promise.all([
        client.waitForAction('custom-action', 1),
        server.send(await client.getId(), 'custom-action', 1)
      ])
    })

    it('should be able to broadcast messages to all clients', async () => {
      const [otherClientProcess, otherClient] = await spawnChildProcessWithAnApi<ClientProcessApi>('./test/integration-test-client.ts', `port=${port}`)
      await otherClient.connect()
      await Promise.all([
        server.broadcast('custom-action', 1),
        client.waitForAction('custom-action', 1),
        otherClient.waitForAction('custom-action', 1)
      ])
      await close(otherClientProcess)
    })

    it('should be update the state and sync the clients', async () => {
      await server.setState({ state: 'new' })
      expect(await server.getState()).toEqual({ state: 'new' })
      expect(await client.getState()).toMatchObject({state: 'new'})
    })

    it('should maintain a list on the server of each clients performance characteristics', async () => {
      const metrics = await server.getMetrics(await client.getId())
      expect(metrics).toMatchObject({
        "dataTransferRate": 0,
        "lag": expect.anything(),
      })
    })

    it('should provide performance characteristics to each client', async () => {
      await wait()
      const metrics = await client.getMetrics()
      expect(metrics).toMatchObject({
        "dataTransferRate": 0,
        "lag": expect.anything(),
      })
    })
  })

  describe('connectivity issues', () => {
    it('should keep in sync even thought child process is paused for a moment', async () => {
      await client.connect()
      pauseClientProcess()
      await server.setState({state: 'new'})
      await wait()
      unpauseClientProcess()
      expect(await client.getState()).toMatchObject({state: 'new'})
    })

    // it('server stops abruptly', () => {})
  })
})
export { InterProcessMessage }

