/**
 * [PROPS]: markdown
 * [POS]: Markdown 渲染（按需懒加载，减少 Reader 首包体积）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
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
