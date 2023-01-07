import { start } from './index'

start(8080, {}, (id) => {
  console.log(id, 'connected')
})

console.log('listening')