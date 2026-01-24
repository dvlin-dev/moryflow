/**
 * [PROVIDES]: groupActions - 命令面板分组工具
 * [DEPENDS]: CommandAction
 * [POS]: Command Palette 数据整理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { CommandAction } from './const';

export const groupActions = (actions: CommandAction[]) => {
  const groups = new Map<string, CommandAction[]>();
  actions.forEach((action) => {
    const groupName = action.group ?? 'Common actions';
    const list = groups.get(groupName) ?? [];
    list.push(action);
    groups.set(groupName, list);
  });
  return Array.from(groups.entries());
};
