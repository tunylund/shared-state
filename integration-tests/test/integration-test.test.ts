import { ChildProcess, spawn, Serializable } from 'child_process'
import { InterProcessMessage, sendToChildProcess, waitForSpecificAction } from './inter-process-messaging.ts'

interface State { state: string}

describe('integration-tests', () => {
  
  let server: ChildProcess,
      port: number,
      client: ChildProcess

  function buildClient(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const client = spawn('tsx', ['./test/integration-test-client.ts', `port=${port}`], { stdio: ['ipc'] })
      client.stdout?.pipe(process.stdout)
      client.stderr?.pipe(process.stderr)
      client.on('error', reject)
      client.on('close', reject)
      resolve(client)
    })
  }

  function buildServer(): Promise<[ChildProcess, number]> {
    const initialState: State = {state: 'initial'}
    return new Promise((resolve, reject) => {
      const server = spawn('tsx', ['./test/integration-test-server.ts', `state=${JSON.stringify(initialState)}`], { stdio: ['ipc'] })
      server.stdout?.pipe(process.stdout)
      server.stderr?.pipe(process.stderr)
      server.once('message', ({ params }: InterProcessMessage) => resolve([server, params]))
      server.on('error', reject)
      server.on('close', reject)
    })
  }

  function close(target: ChildProcess): Promise<any> {
    return new Promise(resolve => {
      if (target && target.connected) {
        target.on('exit', () => resolve(0))
        target.kill()
      } else resolve(0)
    })
  }

  beforeEach(async () => {
    [server, port] = await buildServer()
    client = await buildClient()
  })

  afterEach(async () => {
    await close(client)
    await close(server)
  })

  function pauseClientNetwork() {
    client.kill('SIGSTOP')
  }

  function unpauseClientNetwork() {
    client.kill('SIGCONT')
  }

  const listClients = () => sendToChildProcess<any[]>(server, { method: 'listClients' })
  const changeState = (state: State) => sendToChildProcess<any>(server, { method: 'setState', params: state })
  const getServerState = () => sendToChildProcess<State>(server, { method: 'getState' })
  const sendActionToClient = (clientId: string, action: string, ...args: any[]) => sendToChildProcess<any>(server, { method: 'sendMessageToClient', params: { id: clientId, action, args }})
  const broadcastToAllClients = (action: string, ...args: any[]) => sendToChildProcess<any>(server, { method: 'broadcastToAllClients', params: { action, args }})
  const getServerMetrics = (clientId: string) => sendToChildProcess(server, { method: 'getMetrics', params: clientId })

  const connect = (target = client) => sendToChildProcess<string>(target, { method: 'connect' })
  const getClientId = () => sendToChildProcess<string>(client, { method: 'getId' })
  const getClientState = () => sendToChildProcess<State>(client, { method: 'getState' })
  const getLagMetrics = () => sendToChildProcess<Serializable>(client, { method: 'getStatistics' })
  const wait = () => new Promise(resolve => setTimeout(resolve, 300))
  
  describe('server-side-api', () => {
    it('should trigger an action when a client opens connection ', async () => {
      const waiter = waitForSpecificAction(server, 'connected')
      const id = await connect()
      const args = await waiter
      expect(args[0]).toBe(id)
    })
  
    it('should trigger an action when a client closes connection', async () => {
      const id = await connect()
      const waiter = waitForSpecificAction(server, 'disconnected', id)
      close(client)
      await waiter
    })

    it('should maintain knowledge of which clients are joined', async () => {
      await connect()
      expect(await listClients()).toHaveLength(1)
      await close(client)
      expect(await listClients()).toHaveLength(0)
    })

    it('should be able to send messages to clients', async () => {
      const id = await connect()
      await Promise.all([
        waitForSpecificAction(client, 'custom-action', 1),
        sendActionToClient(id, 'custom-action', 1)
      ])
    })

    it('should be able to broadcast messages to all clients', async () => {
      await connect()
      const otherClient = await buildClient()
      await connect(otherClient)
      await Promise.all([
        broadcastToAllClients('custom-action', 1),
        waitForSpecificAction(client, 'custom-action', 1),
        waitForSpecificAction(otherClient, 'custom-action', 1)
      ])
      await close(otherClient)
    })

    it('should be able to update the state', async () => {
      await changeState({ state: 'new' })
      expect(await getServerState()).toEqual({ state: 'new' })
    })

    it('should maintain a list of client performance characteristics', async () => {
      await connect(client)
      const metrics = await getServerMetrics(await getClientId())
      expect(metrics).toMatchObject({
        "dataTransferRate": 0,
        "lag": expect.anything(),
      })
    })
  })

  describe('client-side-api', () => {
    it('should receive an id upon an established connection', async () => {
      await connect()
      expect(await getClientId()).toBeDefined()
    })

    it('should receive state upon an established connection', async () => {
      await connect()
      expect(await getClientState()).toMatchObject({state: 'initial'})
    })
  
    it('should trigger an action when a connection is established', async () => {
      const waiter = waitForSpecificAction(client, 'connected')
      connect()
      await waiter
    })

    it('should trigger an action when a connection is closed', async () => {
      await connect()
      const waiter = waitForSpecificAction(client, 'disconnected')
      await close(client)
      await waiter
    })

    it('should receive lag statistics periodically of all the connected clients', async () => {
      await connect()
      const metrics = await getLagMetrics()
      expect(metrics).toMatchObject({
        "dataTransferRate": 0,
        "lag": expect.anything(),
      })
    })

    it('should receive state updates', async () => {
      await connect()
      await changeState({state: 'new'})
      expect(await getClientState()).toMatchObject({state: 'new'})
    })
  })

  // describe('connectivity issues', () => {
  //   it('should keep in sync even thought child process is paused for a moment', async () => {
  //     pauseClientNetwork()
  //     await changeState({state: 'new'})
  //     await wait()
  //     unpauseClientNetwork()
  //     await waitUntilClientStateMatches({state: 'new'})
  //   })

  //   it('server stops abruptly', () => {})
  // })
})
export { InterProcessMessage }

