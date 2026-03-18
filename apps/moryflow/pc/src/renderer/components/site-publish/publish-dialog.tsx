/**
 * [PROPS]: PublishDialogProps - 发布弹窗状态与输入源
 * [EMITS]: onOpenChange(open)
 * [POS]: 站点发布弹窗容器（步骤状态编排 + footer 动作）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Loader } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
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
  const { t } = useTranslation('workspace');
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
        setSubdomainMessage(t('publishDialogAtLeast3Chars'));
        return;
      }

      setCheckingSubdomain(true);
      try {
        const result = await checkSubdomain(value);
        setSubdomainValid(result.available);
        setSubdomainMessage(
          result.message ||
            (result.available ? t('publishDialogAvailable') : t('publishDialogUnavailable'))
        );
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
    const input: BuildSiteInput = {
      sourcePaths,
      type: 'MARKDOWN',
      subdomain,
      title: title || undefined,
      description: description || undefined,
    };
    const result = await buildAndPublish(input);
    if (result.success) {
      setPublishedUrl(`https://${subdomain}.moryflow.app`);
      setStep('success');
    } else {
      setErrorMessage(result.error || t('publishDialogFailed'));
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
              {t('publishDialogCancel')}
            </Button>
            <Button onClick={handlePublish} disabled={!subdomain || subdomainValid !== true}>
              {t('publishDialogPublish')}
            </Button>
          </>
        );
      case 'publishing':
        return (
          <Button variant="outline" disabled>
            <Loader className="mr-2 size-4 animate-spin" />
            {t('publishDialogPublishing')}
          </Button>
        );
      case 'success':
      case 'error':
        return <Button onClick={() => onOpenChange(false)}>{t('publishDialogDone')}</Button>;
      default:
        return null;
    }
  };

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && step === 'publishing') return;
      onOpenChange(nextOpen);
    },
    [step, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            {t('publishDialogTitle')}
          </DialogTitle>
          <DialogDescription>{t('publishDialogDescription')}</DialogDescription>
        </DialogHeader>

        {renderContentByStep()}

        <DialogFooter>{renderFooterByStep()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
