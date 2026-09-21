import { shallowRef } from 'vue'

const stack = shallowRef<Array<{ id: symbol; zIndex: number }>>([])
let bodyOverflow = ''

export function enterDialog(id: symbol, zIndex: number): number {
  if (!stack.value.length) {
    bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  const top = stack.value[stack.value.length - 1]
  const resolved = Math.max(zIndex, (top?.zIndex ?? zIndex - 1) + 1)
  stack.value = [...stack.value, { id, zIndex: resolved }]
  return resolved
}

export function isTopDialog(id: symbol): boolean {
  return stack.value[stack.value.length - 1]?.id === id
}

export function leaveDialog(id: symbol): boolean {
  if (!stack.value.some(item => item.id === id)) return false
  const wasTop = isTopDialog(id)
  stack.value = stack.value.filter(item => item.id !== id)
  if (!stack.value.length) document.body.style.overflow = bodyOverflow
  return wasTop
}
