/**
 * [PROPS]: markdown
 * [POS]: Markdown 渲染（按需懒加载，减少 Reader 首包体积）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

interface MarkdownViewProps {
  markdown: string;
  components?: Components;
}

export function MarkdownView({ markdown, components }: MarkdownViewProps) {
  return (
    <Markdown rehypePlugins={[rehypeSanitize]} components={components}>
      {markdown}
    </Markdown>
  );
}
