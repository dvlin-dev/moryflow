/**
 * [PROPS]: None
 * [POS]: SidePanel 内 Developer 入口（跳转到 /developer）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { Link } from '@tanstack/react-router';
import { Icon } from '@anyhunt/ui';
import { CodeIcon } from '@hugeicons/core-free-icons';

export function SidePanelDeveloperEntry() {
  return (
    <div className="p-2">
      <Link
        to="/developer"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon icon={CodeIcon} className="size-4" />
        <span>Developer</span>
      </Link>
    </div>
  );
}
