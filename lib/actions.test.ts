import { on, off, act } from "./actions"

describe('actions', () => {

  const cb = jest.fn()

  it('should react to events', () => {
    on('some-id', 'test', cb)
    act('some-id', 'test', 'some-value')
    expect(cb).toHaveBeenCalledWith('some-value')
  })

  it('should stop reacting to events', () => {
    on('some-id', 'test', cb)
    off('some-id', 'test', cb)
    act('some-id', 'test', ['some-value'])
    expect(cb).not.toHaveBeenCalled()
  })

  it('should not react to someone elses events', () => {
    on('some-id', 'test', cb)
    act('some-other-id', 'test', ['some-value'])
    expect(cb).not.toHaveBeenCalled()
  })
})