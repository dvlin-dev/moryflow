/**
 * [PROPS]: SkillDetailModalProps - 技能详情数据与动作
 * [EMITS]: onToggleEnabled/onUninstall/onTry/onOpenDirectory
 * [POS]: Skills 页面详情弹层
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useMemo, useState } from 'react';
import type { SkillDetail, SkillSummary } from '@shared/ipc';
import { Button } from '@moryflow/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { marked } from 'marked';
import { toast } from 'sonner';

type SkillDetailModalProps = {
  open: boolean;
  skill: SkillSummary | null;
  onOpenChange: (open: boolean) => void;
  onTry: (skillName: string) => Promise<void>;
  onToggleEnabled: (skillName: string, enabled: boolean) => Promise<void>;
  onUninstall: (skillName: string) => Promise<void>;
  onOpenDirectory: (skillName: string) => Promise<void>;
  onLoadDetail: (skillName: string) => Promise<SkillDetail>;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderInlineTextReference = (labelHtml: string, href: string) =>
  `${labelHtml} (${escapeHtml(href)})`;

const skillMarkdownRenderer = new marked.Renderer();
skillMarkdownRenderer.html = ({ text }) => escapeHtml(text);
skillMarkdownRenderer.link = ({ href, tokens }) =>
  renderInlineTextReference(marked.Parser.parseInline(tokens), href);
skillMarkdownRenderer.image = ({ href, text, tokens }) => {
  const altHtml = tokens ? marked.Parser.parseInline(tokens) : escapeHtml(text);
  return renderInlineTextReference(`[Image: ${altHtml}]`, href);
};

const renderSkillMarkdown = (markdown: string) => {
  const result = marked.parse(markdown, {
    breaks: false,
    gfm: true,
    renderer: skillMarkdownRenderer,
  });
  if (typeof result !== 'string') {
    throw new Error('Unexpected async result from marked.parse');
  }
  return result;
};

export const SkillDetailModal = ({
  open,
  skill,
  onOpenChange,
  onTry,
  onToggleEnabled,
  onUninstall,
  onOpenDirectory,
  onLoadDetail,
}: SkillDetailModalProps) => {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const renderedDetail = useMemo(() => {
    if (loading) {
      return { html: null, fallback: 'Loading...' };
    }

    const content = detail?.content?.trim();
    if (!content) {
      return { html: null, fallback: 'No content' };
    }

    try {
      return { html: renderSkillMarkdown(content), fallback: null };
    } catch {
      return { html: null, fallback: content };
    }
  }, [detail?.content, loading]);

  useEffect(() => {
    if (!open || !skill) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    onLoadDetail(skill.name)
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load skill detail');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, skill, onLoadDetail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] min-w-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{skill?.title ?? 'Skill'}</DialogTitle>
          <DialogDescription>{skill?.description ?? ''}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 px-6">
          <div className="min-w-0 overflow-hidden rounded-md border border-border/60 bg-muted/20">
            <ScrollArea className="h-[min(56vh,420px)] min-w-0 w-full">
              <div className="min-w-0 p-4">
                {renderedDetail.html ? (
                  <div
                    className="min-w-0 break-words text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:break-all [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:break-words [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mt-0 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-border/60 [&_img]:max-w-full [&_img]:rounded-md [&_li]:my-1.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs [&_pre_code]:leading-6 [&_table]:my-4 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:break-words [&_td]:align-top [&_td]:border-b [&_td]:border-border/40 [&_td]:px-2 [&_td]:py-2 [&_td]:whitespace-normal [&_th]:break-words [&_th]:border-b [&_th]:border-border/60 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:whitespace-normal [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: renderedDetail.html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {renderedDetail.fallback}
                  </pre>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between px-6 pb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={async () => {
                if (!skill) return;
                try {
                  await onUninstall(skill.name);
                  onOpenChange(false);
                } catch {
                  // 错误提示由上层统一处理；卸载失败时保持弹窗打开，避免误导用户。
                }
              }}
              disabled={!skill}
            >
              Uninstall
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!skill) return;
                await onToggleEnabled(skill.name, !skill.enabled);
              }}
              disabled={!skill}
            >
              {skill?.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!skill) return;
                await onOpenDirectory(skill.name);
              }}
              disabled={!skill}
            >
              Open
            </Button>
          </div>
          <Button
            onClick={async () => {
              if (!skill) return;
              try {
                await onTry(skill.name);
                onOpenChange(false);
              } catch {
                // 错误提示由上层统一处理；失败时保持弹窗打开便于用户继续操作。
              }
            }}
            disabled={!skill || !skill.enabled}
          >
            Try
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
