/**
 * [PROPS]: markdown
 * [POS]: Markdown 渲染（按需懒加载，减少 Reader 首包体积）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownViewProps {
  markdown: string;
}

export function MarkdownView({ markdown }: MarkdownViewProps) {
  return <Markdown rehypePlugins={[rehypeSanitize]}>{markdown}</Markdown>;
}
