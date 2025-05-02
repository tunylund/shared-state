import { createServer } from 'http'
import { EVENTS } from 'shared-state-server'
import * as sharedStateServer from 'shared-state-server'

interface Cube {
  id: string
  hue: number
  velx: number
  vely: number
  x: number
  y: number
  w: number
  h: number
}
interface Dir {
  x: number
  y: number
}
interface GameState {
  cubes: Cube[]
}

function addCube(id: string) {
  const current = sharedStateServer.state<GameState>()
  if (!current.cubes.find(cube => cube.id === id)) {
    const hue = Math.floor(Math.random() * 360)
    current.cubes.push({
      id, x: 0, y: 0, w: 20, h: 20, hue, velx: 0, vely: 0
    })
  }
}

function removeCube(id: string) {
  const current = sharedStateServer.state<GameState>()
  current.cubes = current.cubes.filter(cube => cube.id !== id)
}

const server = createServer((req, res) => {})
sharedStateServer.start(server, {cubes: []}, { debugLog: true })

sharedStateServer.on(EVENTS.CONNECTED, (id: string) => {
  console.log(`Client connected: ${id}`)
  addCube(id)
})

sharedStateServer.on('input', (id: string, dir: Dir) => {
  const cube = sharedStateServer.state<GameState>().cubes.find(cube => cube.id === id)
  if (cube) {
    const speed = 0.05
    cube.velx = dir.x * speed
    cube.vely = dir.y * speed
    sharedStateServer.update(sharedStateServer.state())
  }
})

sharedStateServer.on(EVENTS.DISCONNECTED, (id: string) => {
  console.log(`Client disconnected: ${id}`)
  removeCube(id)
})

let lastStep = Date.now()
setInterval(() => {
  const step = Date.now() - lastStep
  lastStep = Date.now()

  const current = sharedStateServer.state<GameState>()
  current.cubes.map(cube => {
    cube.x = cube.x + cube.velx * step
    cube.y = cube.y + cube.vely * step
  })

  try {
    sharedStateServer.update(sharedStateServer.state())
  } catch (e) {
    console.error(e)
  }
}, Math.floor(1000/60))

server.listen(process.env.PORT || 3000, () => {
  //@ts-ignore
  console.log(`typescript-example-server is running at ${server.address().port}`)
})
