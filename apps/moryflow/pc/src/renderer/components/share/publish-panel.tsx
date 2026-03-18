/**
 * [PROPS]: { fileTitle, onBack, onPublished, subdomain, setSubdomain, ... }
 * [EMITS]: onBack() - 返回上一面板, onPublished(site) - 发布成功
 * [POS]: Share Popover 的发布面板（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState } from 'react';
import { ArrowLeft, CircleCheck, ExternalLink, Loader } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Label } from '@moryflow/ui/components/label';
import { Progress } from '@moryflow/ui/components/progress';
import { useTranslation } from '@/lib/i18n';
import { SubdomainInput } from './subdomain-input';
import type { Site, BuildProgressEvent } from '../../../shared/ipc/site-publish';
import type { SubdomainStatus } from './const';
import { SUBDOMAIN_SUFFIX } from './const';

interface PublishPanelProps {
  fileTitle?: string;
  onBack: () => void;
  onPublished: (site: Site) => void;
  // 状态（从 Hook 传入）
  subdomain: string;
  setSubdomain: (value: string) => void;
  subdomainStatus: SubdomainStatus;
  subdomainMessage?: string;
  publishing: boolean;
  progress: BuildProgressEvent | null;
  onPublish: () => Promise<void>;
}

/** 计算进度百分比 */
function getProgressPercent(progress: BuildProgressEvent | null): number {
  if (!progress) return 0;
  if (progress.phase === 'done') return 100;
  if (progress.phase === 'error') return 0;
  if (progress.total === 0) return 0;
  return Math.round((progress.current / progress.total) * 100);
}

export function PublishPanel({
  onBack,
  subdomain,
  setSubdomain,
  subdomainStatus,
  subdomainMessage,
  publishing,
  progress,
  onPublish,
}: PublishPanelProps) {
  const { t } = useTranslation('workspace');
  const [error, setError] = useState<string>();
  const [published, setPublished] = useState(false);

  const canPublish = !publishing && subdomain && subdomainStatus === 'available';
  const publishedUrl = `https://${subdomain}${SUBDOMAIN_SUFFIX}`;

  const handlePublish = async () => {
    setError(undefined);
    try {
      await onPublish();
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sitesFailedToPublish'));
    }
  };

  if (published) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <CircleCheck className="size-8 text-green-500" />
          <div className="text-center">
            <p className="text-sm font-medium">{t('publishDialogSuccess')}</p>
            <button
              type="button"
              onClick={() => window.open(publishedUrl, '_blank')}
              className="text-xs text-muted-foreground hover:underline"
            >
              {subdomain}
              {SUBDOMAIN_SUFFIX}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open(publishedUrl, '_blank')}>
            <ExternalLink className="mr-1.5 size-3.5" />
            {t('publishDialogVisitSite')}
          </Button>
        </div>
        <div className="border-t border-dashed border-border" />
        <Button variant="ghost" className="w-full" onClick={onBack}>
          {t('publishDialogDone')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onBack}
          disabled={publishing}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{t('sitesPublish')}</span>
      </div>

      {/* Subdomain Input */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t('publishDialogSiteAddress')}</Label>
        <SubdomainInput
          value={subdomain}
          onChange={setSubdomain}
          status={subdomainStatus}
          message={subdomainMessage}
          disabled={publishing}
        />
      </div>

      {/* Progress */}
      {publishing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.message}</span>
            <span>{getProgressPercent(progress)}%</span>
          </div>
          <Progress value={getProgressPercent(progress)} className="h-1" />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Publish Button */}
      <Button className="w-full" onClick={handlePublish} disabled={!canPublish}>
        {publishing ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            {t('publishDialogPublishing')}
          </>
        ) : (
          t('sitesPublish')
        )}
      </Button>
    </div>
  );
}
