import { connect, send, on, ACTIONS, state, statistics } from 'shared-state-client/dist/index'

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

connect('http://localhost:3000', { lagInterval: 500, debugLog: false, fastButUnreliable: true })

on(ACTIONS.INIT, startDrawing)

let updates = 0, updateFps = 0
on(ACTIONS.STATE_UPDATE, () => updates++)
setInterval(() => { updateFps = updates; updates = 0 }, 1000)

function startDrawing(myId: string) {
  const { canvas, ctx } = setup()
  function step() {
    requestAnimationFrame(() => draw(canvas, ctx, myId))
    setTimeout(step, 1000/60)
  }
  step()
}

function setup() {
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
  const current = state<GameState>()

  const hue = current.cubes?.find(({id}: Cube) => id === myId)?.hue
  ctx.fillStyle = `hsla(${hue}, 50%, 75%, 1)`
  ctx.fillRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height)
  
  current.cubes?.map((cube: Cube) => {
    ctx.fillStyle = `hsla(${cube.hue}, 50%, 50%, 1)`
    ctx.strokeStyle = `hsla(${cube.hue}, 80%, 30%, 1)`
    ctx.strokeRect(cube.x, cube.y, cube.w, cube.h)
    ctx.fillRect(cube.x, cube.y, cube.w, cube.h)
  })

  if (statistics(myId)) {
    const { lag, dataTransferRate } = statistics(myId)
    const text = `use ←↑↓→ to move,  lag: ${lag}ms   updates: ${updateFps}/s   data: ${dataTransferRate.toFixed(0)}b/s`
    ctx.font = '12px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(text, canvas.width/2 - 20 - ctx.measureText(text).width, -canvas.height/2 + 20)
  }
}

const keys: { [key: string]: boolean } = {
  ArrowRight: false,
  ArrowLeft: false,
  ArrowUp: false,
  ArrowDown: false,
}

function sendInput() {
  send('input', {
    x: keys.ArrowRight ? 1 : keys.ArrowLeft ? -1 : 0, 
    y: keys.ArrowDown ? 1 : keys.ArrowUp ? -1 : 0
  })
}

document.body.addEventListener('keydown', (ev: KeyboardEvent) => {
  keys[ev.code] = true
  sendInput()
})

document.body.addEventListener('keyup', (ev) => {
  keys[ev.code] = false
  sendInput()
})
