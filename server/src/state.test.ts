import { broadcast, send } from "./transport"
import { init, update, state, addClient, removeClient, State, updateLag } from './state'
import { ACTIONS } from "./actions"
jest.mock('./transport')

interface SomeState extends State {
  some: string
  another: string
}

describe('state', () => {

  beforeEach(() => {
    init<SomeState>({some: 'state'})
  })

  it('should broadcast a new state on init', () => {
    expect(broadcast).toHaveBeenCalledWith(ACTIONS.STATE_INIT, {some: 'state', clients: [], lagStatistics: {}})
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
    addClient('some-id')
    expect(send).toHaveBeenCalledWith('some-id', ACTIONS.STATE_INIT, {some: 'state', clients: ['some-id'], lagStatistics: { 'some-id': Infinity }})
    expect(broadcast).toHaveBeenLastCalledWith(ACTIONS.STATE_UPDATE, expect.anything())
  })

  it('should send update on client removal', () => {
    addClient('some-id')
    removeClient('some-id')
    expect(broadcast).toHaveBeenLastCalledWith(ACTIONS.STATE_UPDATE, expect.anything())
  })

  it('should update lagStatistics', () => {
    updateLag('some-id', 1)
    expect(state()).toMatchObject({lagStatistics: new Map([['some-id', 1]])})
    expect(broadcast).toHaveBeenLastCalledWith(ACTIONS.STATE_UPDATE, expect.anything())
  })
})
