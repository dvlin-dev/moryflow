/**
 * [PROPS]: SkillDetailModalProps - 技能详情数据与动作
 * [EMITS]: onToggleEnabled/onUninstall/onTry/onOpenDirectory
 * [POS]: Skills 页面详情弹层
 * [UPDATE]: 2026-02-11 - 卸载失败时保持弹层不关闭，避免误导用户“已卸载成功”
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import type { SkillDetail, SkillSummary } from '@shared/ipc';
import { Button } from '@anyhunt/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@anyhunt/ui/components/dialog';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { toast } from 'sonner';

type SkillDetailModalProps = {
  open: boolean;
  skill: SkillSummary | null;
  onOpenChange: (open: boolean) => void;
  onTry: (skillName: string) => void;
  onToggleEnabled: (skillName: string, enabled: boolean) => Promise<void>;
  onUninstall: (skillName: string) => Promise<void>;
  onOpenDirectory: (skillName: string) => Promise<void>;
  onLoadDetail: (skillName: string) => Promise<SkillDetail>;
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{skill?.title ?? 'Skill'}</DialogTitle>
          <DialogDescription>{skill?.description ?? ''}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/60 bg-muted/20">
          <ScrollArea className="h-[360px] w-full">
            <pre className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-foreground">
              {loading ? 'Loading...' : detail?.content || 'No content'}
            </pre>
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between">
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
            onClick={() => {
              if (!skill) return;
              onTry(skill.name);
              onOpenChange(false);
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
