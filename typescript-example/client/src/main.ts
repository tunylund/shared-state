import { loop, Entity, draw, buildControls } from 'tiny-game-engine/lib/index'
import { connect, send, on, ACTIONS, state, State } from 'shared-state-client/dist/index'

interface Cube extends Entity {
  id: string
  hue: number
}
interface GameState extends State {
  clients: string[]
  cubes: Cube[]
}

connect('http://localhost:3000', { lagInterval: 500, debugLog: false, fastButUnreliable: true })

let myId: string
on(ACTIONS.INIT, (id: string) => myId = id)

let updates = 0, updateFps = 0
on(ACTIONS.STATE_UPDATE, () => updates++)
setInterval(() => { updateFps = updates; updates = 0 }, 1000)

loop((step, duration) => {
  const current = state<GameState>()

  draw(function drawBackground(ctx, cw, ch) {
    const hue = current.cubes?.find(({id}: Cube) => id === myId)?.hue
    ctx.fillStyle = `hsla(${hue}, 50%, 75%, 1)`
    ctx.fillRect(-cw, -ch, cw*2, ch*2)
  })

  draw(function drawCubes(ctx: CanvasRenderingContext2D) {
    current.cubes?.map((cube: Cube) => {
      ctx.fillStyle = `hsla(${cube.hue}, 50%, 50%, 1)`
      ctx.strokeStyle = `hsla(${cube.hue}, 80%, 30%, 1)`
      ctx.strokeRect(cube.pos.cor.x, cube.pos.cor.y, cube.dim.x, cube.dim.y)
      ctx.fillRect(cube.pos.cor.x, cube.pos.cor.y, cube.dim.x, cube.dim.y)
    })
  })

  if (current.lagStatistics?.hasOwnProperty(myId)) {
    draw(function drawHud(ctx, cw, ch) {
      const lag = current.lagStatistics[myId]
      const text = `lag: ${lag}ms   updates: ${updateFps}/s`
      ctx.font = '12px Arial'
      ctx.fillStyle = 'white'
      ctx.fillText(text, cw - 20 - ctx.measureText(text).width, -ch + 20)
    })
  }
})

buildControls(window, ({dir}) => send('input', dir))
