class AbortController {
  signal = {}
  abort () {}
}
global.AbortController = (AbortController as any)

import { ACTIONS, connect, on } from "./index";

connect('0.0.0.0:8080')

on(ACTIONS.INIT, (id: string) => {
  console.log(id)
})
