import { on, EVENTS } from './events.js'
import deepDiff, { Diff } from 'deep-diff'

let current = {}

function decompressKeys(diff: any): Diff<any, any> {
  const result: any = { kind: diff.k }
  if (diff.hasOwnProperty('p')) result.path = diff.p
  if (diff.hasOwnProperty('l')) result.lhs = diff.l
  if (diff.hasOwnProperty('r')) result.rhs = diff.r
  if (diff.hasOwnProperty('x')) result.index = diff.x
  if (diff.hasOwnProperty('i')) result.item = diff.i
  return result
}

on(EVENTS.INIT, (_: any, newState: any) => current = newState)

on(EVENTS.STATE_UPDATE, (diffs: Array<Diff<any, any>>) => {
  diffs.map(decompressKeys).map(diff => deepDiff.applyChange(current, {}, diff))
})

export function state<T>(): T {
  return current as T
}
