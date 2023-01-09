import { ACTIONS, connect, on, send, state } from "./index";

connect('0.0.0.0:8080')

on(ACTIONS.INIT, (id: string) => {
  console.log(id)

  send('foo', 'bar')
})

on(ACTIONS.CLIENT_UPDATE, () => {
  console.log('state', state())
})
