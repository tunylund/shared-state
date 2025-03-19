import { ChildProcess, spawn, Serializable } from 'child_process'

interface State { state: string}

describe('integration-tests', () => {
  
  let server: ChildProcess,
      port: number,
      client: ChildProcess

  function buildClient(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const client = spawn('node', ['--experimental-modules', './test/integration-test-client.mjs', `port=${port}`], { stdio: ['ipc'] })
      client.stdout?.pipe(process.stdout)
      client.stderr?.pipe(process.stderr)
      client.on('message', () => resolve(client))
      client.on('error', reject)
      client.on('close', reject)
    })
  }

  function buildServer(): Promise<[ChildProcess, number]> {
    const initialState: State = {state: 'initial'}
    return new Promise((resolve, reject) => {
      const server = spawn('node', ['--experimental-modules', './test/integration-test-server.js', `state=${JSON.stringify(initialState)}`], { stdio: ['ipc'] })
      server.stdout?.pipe(process.stdout)
      server.stderr?.pipe(process.stderr)
      server.on('close', () => console.log('server closed'))
      server.on('message', (port: number) => resolve([server, port]))
      server.on('error', reject)
      server.on('close', reject)
    })
  }

  function close(target: ChildProcess): Promise<any> {
    return new Promise(resolve => {
      if (target && target.connected) {
        target.on('exit', () => resolve(0))
        target.disconnect()
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

  function send<T>(target: ChildProcess, message: Serializable): Promise<T> {
    return new Promise(resolve => {
      target.on('message', resolve)
      target.send(message)
    })
  }

  function pauseClientNetwork() {
    client.kill('SIGSTOP')
  }

  function unpauseClientNetwork() {
    client.kill('SIGCONT')
  }

  function waitUntilClientStateMatches(expected: State): Promise<State> {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const attempt = async () => {
        const state = await getClientState()
        if (state.state === expected.state) resolve(state)
        else {
          if (Date.now() - start < 2000) setTimeout(attempt, 50)
          else expect(state).toMatchObject(expected)
        }
      }
      attempt()
    })
  }

  const listClients = () => send<any[]>(server, 'listClients')
  const changeState = (state: State) => send<any>(server, state)
  const getClientId = () => send<string>(client, 'getId')
  const getClientState = () => send<State>(client, 'getState')
  const getLagStatistics = () => send<Serializable>(client, 'getStatistics')
  const waitForConsistency = () => new Promise(resolve => setTimeout(resolve, 300))
  
  it('should maintain knowledge of which clients are joined', async () => {
    expect(await listClients()).toHaveLength(1)
    await close(client)
    expect(await listClients()).toHaveLength(0)
  })

  it('should send id to newly connected clients', async () => {
    expect(await getClientId()).not.toBeNull()
  })

  it('should send state to newly connected clients', async () => {
    await waitUntilClientStateMatches({state: 'initial'})
  })

  it('should send state updates to connected clients', async () => {
    await changeState({state: 'new'})
    await waitUntilClientStateMatches({state: 'new'})
  })

  it('should send lag statistics periodically to the connected clients', async () => {
    await waitForConsistency()
    const stats = await getLagStatistics()
    expect(stats).toHaveProperty('lag')
  })
  
  it('should keep in sync even thought child process is paused for a moment', async () => {
    pauseClientNetwork()
    await changeState({state: 'new'})
    await waitForConsistency()
    unpauseClientNetwork()
    await waitUntilClientStateMatches({state: 'new'})
  })
})
