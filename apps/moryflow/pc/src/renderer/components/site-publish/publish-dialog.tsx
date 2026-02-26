/**
 * [PROPS]: PublishDialogProps - 发布弹窗状态与输入源
 * [EMITS]: onOpenChange(open)
 * [POS]: 站点发布弹窗容器（步骤状态编排 + footer 动作）
 * [UPDATE]: 2026-02-26 - 拆分步骤片段到 step-content，统一 step -> switch 渲染
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Loader } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { Button } from '@moryflow/ui/components/button';
import type { BuildSiteInput } from '../../../shared/ipc/site-publish';
import { useSitePublish } from './use-site-publish';
import {
  PublishConfigStep,
  PublishErrorStep,
  PublishProgressStep,
  PublishSuccessStep,
} from './publish-dialog-step-content';

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePaths: string[];
  title?: string;
};

type PublishStep = 'config' | 'publishing' | 'success' | 'error';

export function PublishDialog({
  open,
  onOpenChange,
  sourcePaths,
  title: defaultTitle,
}: PublishDialogProps) {
  const { buildAndPublish, checkSubdomain, progress } = useSitePublish();

  const [subdomain, setSubdomain] = useState('');
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [subdomainValid, setSubdomainValid] = useState<boolean | null>(null);
  const [subdomainMessage, setSubdomainMessage] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [step, setStep] = useState<PublishStep>('config');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setStep('config');
      setSubdomain('');
      setTitle(defaultTitle || '');
      setDescription('');
      setSubdomainValid(null);
      setSubdomainMessage('');
      setErrorMessage('');
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [open, defaultTitle]);

  const validateSubdomain = useCallback(
    async (value: string) => {
      if (value.length < 3) {
        setSubdomainValid(false);
        setSubdomainMessage('At least 3 characters');
        return;
      }

      setCheckingSubdomain(true);
      try {
        const result = await checkSubdomain(value);
        setSubdomainValid(result.available);
        setSubdomainMessage(result.message || (result.available ? 'Available' : 'Unavailable'));
      } finally {
        setCheckingSubdomain(false);
      }
    },
    [checkSubdomain]
  );

  const handleSubdomainChange = useCallback(
    (rawValue: string) => {
      const value = rawValue.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setSubdomain(value);
      setSubdomainValid(null);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (value.length >= 3) {
        debounceTimerRef.current = setTimeout(() => {
          void validateSubdomain(value);
        }, 500);
      }
    },
    [validateSubdomain]
  );

  const handlePublish = useCallback(async () => {
    if (!subdomain || subdomainValid !== true) {
      return;
    }

    setStep('publishing');
    try {
      const input: BuildSiteInput = {
        sourcePaths,
        type: 'MARKDOWN',
        subdomain,
        title: title || undefined,
        description: description || undefined,
      };
      await buildAndPublish(input);
      setPublishedUrl(`https://${subdomain}.moryflow.app`);
      setStep('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Publishing failed');
      setStep('error');
    }
  }, [buildAndPublish, description, sourcePaths, subdomain, subdomainValid, title]);

  const progressPercent = progress
    ? progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0
    : 0;

  const renderContentByStep = () => {
    switch (step) {
      case 'config':
        return (
          <PublishConfigStep
            model={{
              sourcePaths,
              subdomain,
              subdomainValid,
              subdomainMessage,
              checkingSubdomain,
              title,
              description,
            }}
            actions={{
              onSubdomainChange: handleSubdomainChange,
              onTitleChange: setTitle,
              onDescriptionChange: setDescription,
            }}
          />
        );
      case 'publishing':
        return <PublishProgressStep progress={progress} progressPercent={progressPercent} />;
      case 'success':
        return <PublishSuccessStep publishedUrl={publishedUrl} />;
      case 'error':
        return <PublishErrorStep errorMessage={errorMessage} />;
      default:
        return null;
    }
  };

  const renderFooterByStep = () => {
    switch (step) {
      case 'config':
        return (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={!subdomain || subdomainValid !== true}>
              Publish
            </Button>
          </>
        );
      case 'publishing':
        return (
          <Button variant="outline" disabled>
            <Loader className="mr-2 size-4 animate-spin" />
            Publishing...
          </Button>
        );
      case 'success':
      case 'error':
        return <Button onClick={() => onOpenChange(false)}>Done</Button>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Publish to Website
          </DialogTitle>
          <DialogDescription>Publish selected documents as a public site.</DialogDescription>
        </DialogHeader>

        {renderContentByStep()}

        <DialogFooter>{renderFooterByStep()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

