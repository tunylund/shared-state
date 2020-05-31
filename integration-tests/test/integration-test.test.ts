import { fork, ChildProcess, spawn, Serializable } from 'child_process'

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
    const initialState = {state: 'initial'}
    return new Promise((resolve, reject) => {
      const server = fork('./test/integration-test-server.js', [`state=${JSON.stringify(initialState)}`], {silent: true})
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
      if (target.connected) {
        target.on('exit', () => resolve())
        target.disconnect()
      } else resolve()
    })
  }

  beforeEach(async () => {
    [server, port] = await buildServer()
    client = await buildClient()
  })

  afterEach(async () => {
    await close(server)
    await close(client)
  })

  function send<T>(target: ChildProcess, message: Serializable): Promise<T> {
    return new Promise(resolve => {
      target.on('message', resolve)
      target.send(message)
    })
  }

  const listClients = () => send<any[]>(server, 'listClients')
  const changeState = (state: Serializable) => send<any>(server, state)
  const getClientId = () => send<string>(client, 'getId')
  const getClientState = () => send<Serializable>(client, 'getState')
  const getLagStatistics = () => send<Serializable>(client, 'getStatistics')
  const waitForConsistency = () => new Promise(resolve => setTimeout(resolve, 250))

  it('should maintain knowledge of which clients are joined', async () => {
    expect(await listClients()).toHaveLength(1)
    client.disconnect()
    await waitForConsistency()
    expect(await listClients()).toHaveLength(0)
  })

  it('should send id newly connected clients', async () => {
    expect(await getClientId()).not.toBeNull()
  })

  it('should send state to newly connected clients', async () => {
    await waitForConsistency()
    expect(await getClientState()).toMatchObject({state: 'initial'})
  })

  it('should send state updates to connected clients', async () => {
    await changeState({state: 'new'})
    expect(await getClientState()).toMatchObject({state: 'new'})
  })

  it('should send lag statistics periodically to the connected clients', async () => {
    await waitForConsistency()
    const stats = await getLagStatistics()
    expect(Object.values(stats)).toHaveLength(1)
    expect(Object.values(stats)[0]).toHaveProperty('lag')
  })
})
