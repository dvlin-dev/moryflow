/**
 * [PROPS]: title, description, request, codeExample, result
 * [EMITS]: none
 * [POS]: Playground 页面共享壳层（标题 + 双栏布局）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { ReactNode } from 'react';

interface PlaygroundPageShellProps {
  title: string;
  description: string;
  request: ReactNode;
  codeExample?: ReactNode;
  result: ReactNode;
}

export function PlaygroundPageShell({
  title,
  description,
  request,
  codeExample,
  result,
}: PlaygroundPageShellProps) {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {request}
          {codeExample ?? null}
        </div>

        <div>{result}</div>
      </div>
    </div>
  );
}
