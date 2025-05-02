import { ChildProcess, exec, execSync, Serializable, spawn } from 'child_process'
import { spawnChildProcessWithAnApi, InterProcessMessage } from './inter-process-messaging.ts'
import { Toxiproxy, Proxy, ICreateToxicBody, Bandwidth, Timeout } from 'toxiproxy-node-client'

interface State { state: string}

export interface ServerProcessApi {
  listClients: () => Promise<string[]>
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
      proxy: Proxy,
      toxiproxyClient: Toxiproxy,
      serverProcess: ChildProcess,
      clientProcess: ChildProcess,
      toxiproxyServerProcess: ChildProcess,
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

  async function startToxiproxyServer(): Promise<void> {
    toxiproxyServerProcess = spawn("toxiproxy-server", ["-port", "8474",  "-host", "localhost"], { stdio: ['ipc'], env: { ...process.env, LOG_LEVEL: 'debug' } })
    toxiproxyServerProcess.stdout?.pipe(process.stdout)
    toxiproxyServerProcess.stderr?.pipe(process.stderr)
    
    toxiproxyClient = new Toxiproxy("http://localhost:8474");

    while (true) {
      try {
        await toxiproxyClient.getVersion()
        break
      } catch (e) {
        await wait(50)
      }
    }
    
    proxy = await toxiproxyClient.createProxy({
      listen: "127.0.0.1:13999",
      name: "toxic-proxy",
      upstream: `127.0.0.1:14000`
    })
  }

  function stopToxiproxyServer() {
    return close(toxiproxyServerProcess)
  }

  beforeAll(startToxiproxyServer)
  afterAll(stopToxiproxyServer)

  beforeEach(async () => {
    [serverProcess, server, port] = await spawnChildProcessWithAnApi<ServerProcessApi>('./test/integration-test-server.ts', `state=${JSON.stringify({state: 'initial'})}`);
    [clientProcess, client] = await spawnChildProcessWithAnApi<ClientProcessApi>('./test/integration-test-client.ts', `port=13999`);
  })

  afterEach(async () => {
    await close(clientProcess)
    await close(serverProcess)
    await toxiproxyClient.reset()
  })

  const wait = (timeMs = 300) => new Promise(resolve => setTimeout(resolve, timeMs))
  
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
        "dataTransferRate": expect.anything(),
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
    beforeEach(() => client.connect())

    it('should reconnect the client and regain the same client id if the client gets disconnected because of a network issue', async () => {
      const originalClientId = await client.getId()

      const networkPartitionToxic = <ICreateToxicBody<Timeout>>{
        name: 'network-partition',
        stream: 'downstream',
        type: 'timeout',
        toxicity: 1,
        attributes: { timeout: 1000 }
      }
      await proxy.addToxic(networkPartitionToxic)
      await wait(1000)
      await (await proxy.getToxic("network-partition")).remove()
      await client.waitForAction('init')

      expect(await client.getId()).toEqual(originalClientId)
    })

    it('should reconnect the client and resync the state if the client gets disconnected because of a network issue', async () => {
      const networkPartitionToxic = <ICreateToxicBody<Timeout>>{
        name: 'network-partition',
        stream: 'downstream',
        type: 'timeout',
        toxicity: 1,
        attributes: { timeout: 1000 }
      }
      await proxy.addToxic(networkPartitionToxic)
      await server.setState({state: 'state-1'})
      await server.setState({state: 'state-2'})
      await server.setState({state: 'state-3'})
      expect(await client.getState()).toMatchObject({state: 'initial'})
      await (await proxy.getToxic("network-partition")).remove()
      await client.waitForAction('init')

      expect(await client.getState()).toMatchObject({state: 'state-3'})
    })

    it('should provide a new id to the client if the previous client id is no longer available. This could happen if the server restarts and the state is lost', async () => {
      const originalClientId = await client.getId()

      const networkPartitionToxic = <ICreateToxicBody<Timeout>>{
        name: 'network-partition',
        stream: 'downstream',
        type: 'timeout',
        toxicity: 1,
        attributes: { timeout: 1000 }
      }
      await proxy.addToxic(networkPartitionToxic)
      await close(serverProcess);
      await stopToxiproxyServer();
      [serverProcess, server, port] = await spawnChildProcessWithAnApi<ServerProcessApi>('./test/integration-test-server.ts', `state=${JSON.stringify({state: 'initial'})}`);
      await startToxiproxyServer()
      await client.waitForAction('connected')

      expect(await client.getId()).not.toEqual(originalClientId)
    })

    // Websockets are built over tcp which handles network packet losses, this is basically testing tcp, but the test might be useful in the future if
    // the implementation switches to udp over webtransports
    it('should eventually recover state synchronization when packets are lost', async () => {
      const packetLossToxic = <ICreateToxicBody<Bandwidth>>{
        name: 'packet-loss',
        stream: 'downstream',
        type: 'bandwidth',
        toxicity: 0.9, // 90% packet loss
        attributes: { rate: 100 } // 100 bytes per second
      }
      await proxy.addToxic(packetLossToxic)

      for (let i = 0; i < 5; i++) {
        const newState = { state: `state-${i}` }
        await server.setState(newState)
      }

      await (await proxy.getToxic("packet-loss")).remove()
      expect(await client.getState()).toMatchObject({ state: 'state-4' })
    })

    // it('should not be able to steal a session', async () => {
    // })
    // it('should survive id negotiation race conditions', async () => {
    // })
    // it('should drop clients after a timeout', async () => {
    // })
    // it('should reconnect the client and resync the state if the server gets disconnected', async () => {
    // })

  })
})
