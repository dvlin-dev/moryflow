import type { CommandAction } from './const'

export const groupActions = (actions: CommandAction[]) => {
  const groups = new Map<string, CommandAction[]>()
  actions.forEach((action) => {
    const groupName = action.group ?? '常用操作'
    const list = groups.get(groupName) ?? []
    list.push(action)
    groups.set(groupName, list)
  })
  return Array.from(groups.entries())
}

