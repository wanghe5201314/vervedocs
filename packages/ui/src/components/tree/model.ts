export interface VdFlatNode {
  id: string
  name: string
  level: number
  number?: string
}

export interface VdTreeNode extends VdFlatNode {
  children?: VdTreeNode[]
}

export function buildTreeFromFlat(items: readonly VdFlatNode[]): VdTreeNode[] {
  const roots: VdTreeNode[] = []
  const stack: VdTreeNode[] = []
  for (const item of items) {
    const node: VdTreeNode = {
      ...item,
      level: Number.isFinite(item.level) ? Math.max(1, Math.trunc(item.level)) : 1
    }
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
    stack.push(node)
  }
  return roots
}
