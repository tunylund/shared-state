import { createServer } from 'http'
import { start, state, update, on, State, ACTIONS } from 'shared-state-server'
import {
  loop, Entity, Controls, vector, XYZ,
  move, position, cube, xyz, mul
} from 'tiny-game-engine'

interface Cube extends Entity {
  id: string
  hue: number
}
interface GameState extends State {
  cubes: Cube[]
}

function addCube(id: string) {
  const current = state<GameState>()
  const hue = Math.floor(Math.random() * 360)
  current.cubes.push({
    id, pos: position(), dim: cube(20), hue
  })
}

function removeCube(id: string) {
  const current = state<GameState>()
  current.cubes = current.cubes.filter(cube => cube.id !== id)
}

const server = createServer((req, res) => {})
start(server, {cubes: []}, (id: string) => {
  addCube(id)
  on(id, 'input', (dir: XYZ) => {
    const cube = state<GameState>().cubes.find(cube => cube.id === id)
    if (cube) {
      cube.pos.vel = mul(vector(dir.radian, dir.size * 50), xyz(1, -1))
      update(state())
    }
  })
  on(id, ACTIONS.CLOSE, () => {
    removeCube(id)
  })
})

let steps = []
loop((step, gameDuration) => {
  const current = state<GameState>()
  steps.push(step)
  current.cubes.map(cube => {
    cube.pos = move(cube.pos, step)
  })
}, {
  requestAnimationFrame: setImmediate,
  cancelAnimationFrame: clearImmediate
})

setInterval(()=>update(state()), Math.floor(1000/60))

server.listen(process.env.PORT || 0, () => {
  //@ts-ignore
  console.log(`tiny-td is running at ${server.address().port}`)
})
