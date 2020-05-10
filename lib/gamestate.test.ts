import { broadcast, send } from "./transport"
import { init, update, GAMESTATE, addClient, removeClient } from './gamestate'
jest.mock('./transport')

describe('gamestate', () => {
  it('should broadcast a new state on init', () => {
    init({some: 'state', clients: []})
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.INIT, {some: 'state', clients: []})
  })

  it('should broadcast diff on update', () => {
    init({some: 'state', another: 'state', clients: []})
    update({some: 'new', another: 'state', clients: []})
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.UPDATE, {some: 'new'})
  })

  it('should send init on new client join', () => {
    init({some: 'state', clients: []})
    addClient('1')
    expect(send).toHaveBeenCalledWith('1', GAMESTATE.INIT, {some: 'state', clients: ['1']})
  })

  it('should send update on client removal', () => {
    init({some: 'state', clients: ['1', '2']})
    removeClient('1')
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.UPDATE, {clients: ['2']})
  })
})
