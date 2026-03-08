/**
 * [PROPS]: title, description, children
 * [EMITS]: none
 * [POS]: Remote Agents 页面中的单个远程入口 section 容器
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ReactNode } from 'react';

type RemoteAgentSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const RemoteAgentSection = ({
  title,
  description,
  children,
}: RemoteAgentSectionProps) => {
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-xs">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  );
};
