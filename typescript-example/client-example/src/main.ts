import * as sharedStateClient from 'shared-state-client/dist/index'
import { EVENTS } from 'shared-state-client/dist/index'

interface Cube {
  id: string
  hue: number
  x: number
  y: number
  w: number
  h: number
}
interface GameState {
  clients: string[]
  cubes: Cube[]
}

sharedStateClient.connect('http://localhost:3000', { lagInterval: 500, debugLog: false, fastButUnreliable: true })

sharedStateClient.on(EVENTS.CONNECTED, (myId: string) => {
  const { canvas, ctx } = createCanvas()
  function step() {
    requestAnimationFrame(() => draw(canvas, ctx, myId))
    setTimeout(step, 1000/60)
  }
  step()
})

let updates = 0, updateFps = 0
sharedStateClient.on(EVENTS.STATE_UPDATE, () => updates++)
setInterval(() => { updateFps = updates; updates = 0 }, 1000)

function createCanvas() {
  const canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not instantiate canvas')
  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight  
  }
  resize()

  ctx.translate(canvas.width / 2, canvas.height / 2)
  
  window.addEventListener('resize', resize)
  document.body.appendChild(canvas)
  
  return { canvas, ctx }
}

function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, myId: string) {
  const current = sharedStateClient.state<GameState>()

  ctx.fillStyle = `rgb(217, 217, 217)`
  ctx.fillRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height)
  
  current.cubes?.map((cube: Cube) => {
    ctx.fillStyle = `hsla(${cube.hue}, 50%, 50%, 1)`
    if (cube.id === myId) ctx.strokeStyle = `hsla(0, 100%, 0%, 1)`
    else ctx.strokeStyle = `hsla(${cube.hue}, 80%, 30%, 1)`
    ctx.strokeRect(cube.x, cube.y, cube.w, cube.h)
    ctx.fillRect(cube.x, cube.y, cube.w, cube.h)
  })

  if (sharedStateClient.metrics(myId)) {
    const { lag, dataTransferRate } = sharedStateClient.metrics(myId)
    const text = `lag: ${lag}ms   updates: ${updateFps}/s   data: ${dataTransferRate.toFixed(0)}b/s`
    ctx.font = '12px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(text, canvas.width/2 - 20 - ctx.measureText(text).width, -canvas.height/2 + 20)
  }
}

setInterval(() => {
  sharedStateClient.send('input', {
    x: [-1, 0, 1][Math.floor(Math.random() * 3)],
    y: [-1, 0, 1][Math.floor(Math.random() * 3)],
  })
}, 1000)
