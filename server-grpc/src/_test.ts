import { on, send, start, state, update } from './index'

start(8080, {}, (id) => {
  console.log(id, 'connected')

  on(id, 'foo', (value: string) => {
    console.log('client', id)
    update({ ...state<any>(), foo: value})
    setTimeout(() => {
      send(id, "car", "zar")
    }, 1000)
  })
})

console.log('listening')

