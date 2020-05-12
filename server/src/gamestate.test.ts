import { broadcast, send } from "./transport"
import { init, update, state, GAMESTATE, addClient, removeClient } from './gamestate'
jest.mock('./transport')

describe('gamestate', () => {

  beforeEach(() => {
    init({some: 'state', clients: ['1']})
  })

  it('should broadcast a new state on init', () => {
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.INIT, {some: 'state', clients: ['1']})
  })

  it('should update values in the state', () => {
    update({some: 'new'})
    expect(state()).toMatchObject({some: 'new', clients: ['1']})
  })

  it('should add fields to the state', () => {
    update({some: 'state', another: 'new'})
    expect(state()).toMatchObject({some: 'state', another: 'new', clients: ['1']})
  })

  it('should remove values from the state', () => {
    update({})
    expect(state()).toMatchObject({clients: ['1']})
  })

  it('should broadcast diff on update', () => {
    update({some: 'new', another: 'state'})
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.UPDATE, {some: 'new', another: 'state', clients: ['1']})
  })

  it('should send init on new client join', () => {
    addClient('2')
    expect(send).toHaveBeenCalledWith('2', GAMESTATE.INIT, {some: 'state', clients: ['1', '2']})
  })

  it('should send update on client removal', () => {
    removeClient('1')
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.UPDATE, {some: 'state', clients: []})
  })
})
