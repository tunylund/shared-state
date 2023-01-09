import { init, update, state, initState } from './state'
import { ACTIONS } from "./actions"
import { broadcast, send } from './peers'
jest.mock('./peers')

interface SomeState {
  some: string
  another?: string
}

describe('state', () => {

  beforeEach(() => {
    init<SomeState>({ some: 'state' })
  })

  it('should broadcast a new state on init', () => {
    expect(broadcast).toHaveBeenCalledWith(ACTIONS.STATE_INIT, {some: 'state' })
  })

  it('should update values in the state', () => {
    update<SomeState>({some: 'new'})
    expect(state()).toMatchObject({some: 'new'})
  })

  it('should add fields to the state', () => {
    update<SomeState>({some: 'state', another: 'new'})
    expect(state()).toMatchObject({some: 'state', another: 'new'})
  })

  it('should remove fields from the state', () => {
    update({})
    expect(state()).not.toHaveProperty('some')
  })

  it('should broadcast updates on state changes', () => {
    update<SomeState>({some: 'new', another: 'state'})
    expect(broadcast).toHaveBeenLastCalledWith(ACTIONS.STATE_UPDATE, expect.anything())
  })

  it('should send init on new client join', () => {
    initState('some-id')
    expect(send).toHaveBeenCalledWith('some-id', ACTIONS.STATE_INIT, {some: 'state' })
  })
})
