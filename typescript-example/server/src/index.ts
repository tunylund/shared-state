import { createServer } from 'http'
import { start, state, update, on, ACTIONS } from 'shared-state-server'

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
  const current = state<GameState>()
  const hue = Math.floor(Math.random() * 360)
  current.cubes.push({
    id, x: 0, y: 0, w: 20, h: 20, hue, velx: 0, vely: 0
  })
}

function removeCube(id: string) {
  const current = state<GameState>()
  current.cubes = current.cubes.filter(cube => cube.id !== id)
}

const server = createServer((req, res) => {})
start(server, {cubes: []}, (id: string) => {
  addCube(id)
  on(id, 'input', (dir: Dir) => {
    const cube = state<GameState>().cubes.find(cube => cube.id === id)
    if (cube) {
      const speed = 0.05
      cube.velx = dir.x * speed
      cube.vely = dir.y * speed
      update(state())
    }
  })
  on(id, ACTIONS.CLOSE, () => {
    removeCube(id)
  })
}, { debugLog: true })

let lastStep = Date.now()
setInterval(() => {
  const step = Date.now() - lastStep
  lastStep = Date.now()

  const current = state<GameState>()
  current.cubes.map(cube => {
    cube.x = cube.x + cube.velx * step
    cube.y = cube.y + cube.vely * step
  })

  try {
    update(state())
  } catch (e) {
    console.error(e)
  }
}, Math.floor(1000/60))

server.listen(process.env.PORT || 3000, () => {
  //@ts-ignore
  console.log(`typescript-example-server is running at ${server.address().port}`)
})
