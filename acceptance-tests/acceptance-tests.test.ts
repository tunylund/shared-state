import { fork, ChildProcess, spawn } from 'child_process'

jest.setTimeout(10000)

describe('high-level-tests', () => {
  const initialState = {some: 'state'}
  let server: ChildProcess,
      port: number,
      clients: Set<ChildProcess> = new Set()

  async function buildClient(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const client = spawn('node', ['--experimental-modules', './acceptance-tests/acceptance-test-client.mjs', `port=${port}`], { stdio: ['ipc'] })
      client.stdout?.pipe(process.stdout)
      client.stderr?.pipe(process.stderr)
      client.on('message', () => resolve(client))
      client.on('error', reject)
      client.on('close', reject)
      client.on('exit', () => clients.delete(client))
      clients.add(client)
    })
  }

  async function buildServer(): Promise<[ChildProcess, number]> {
    return new Promise((resolve, reject) => {
      const server = fork('./acceptance-tests/acceptance-test-server.js', [], {silent: true})
      server.stdout?.pipe(process.stdout)
      server.stderr?.pipe(process.stderr)
      server.on('close', () => console.log('server closed'))
      server.on('message', (port: number) => resolve([server, port]))
    })
  }

  beforeEach(async () => {
    [server, port] = await buildServer()
  })

  afterEach(async () => {
    const serverClosed = new Promise((resolve) => {
      server.on('exit', () => resolve())
      server.disconnect()
    })
    const clientsClosed = Array.from(clients).map(client => new Promise(resolve => {
      client.on('exit', () => resolve())
      client.disconnect()
    }))

    return Promise.all([serverClosed, ...clientsClosed])
  })

  async function listClients(): Promise<any[]> {
    return new Promise(resolve => {
      server.on('message', resolve)
      server.send('listClients')
    })
  }

  async function getState(client: ChildProcess): Promise<any> {
    return new Promise(resolve => {
      client.on('message', resolve)
      client.send('getState')
    })
  }

  async function waitForConsistency() {
    return new Promise(resolve => setTimeout(resolve, 500))
  }

  it('should maintain knowledge of which clients are joined', async () => {
    expect(await listClients()).toHaveLength(0)
    const clienta = await buildClient()
    expect(await listClients()).toHaveLength(1)
    clienta.disconnect()
    await waitForConsistency()
    expect(await listClients()).toHaveLength(0)
  })

  it('should send state to newly connected clients', async () => {
    const clienta = await buildClient()
    await waitForConsistency()
    expect(await getState(clienta)).toMatchObject(initialState)
  })

})
