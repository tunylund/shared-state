import { broadcast } from "./transport"
import { init, update, GAMESTATE } from './gamestate'
jest.mock('./transport')

describe('gamestate', () => {
  it('should broadcast a new state on init', () => {
    init({some: 'state'})
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.INIT, {some: 'state'})
  })
  it('should broadcast diff on update', () => {
    init({some: 'state', another: 'state'})
    update({some: 'new', another: 'state'})
    expect(broadcast).toHaveBeenCalledWith(GAMESTATE.UPDATE, {some: 'new'})
  })
})
