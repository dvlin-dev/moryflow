import { useState, useCallback } from 'react';
import { UrlInput } from './UrlInput';
import { PresetButtons } from './PresetButtons';
import { ResultPreview } from './ResultPreview';
import { StatsBar } from './StatsBar';
import { Turnstile } from './Turnstile';
import { CaptchaStatus } from './CaptchaStatus';
import { captureScreenshot, type CaptureResult } from '@/lib/api';
import { usePublicEnv } from '@/routes/__root';
import { useCaptchaVerification } from '@/hooks/useCaptchaVerification';

export function QuickPlayground() {
  const { turnstileSiteKey, apiUrl } = usePublicEnv();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);

  const {
    isVerified,
    checkingStatus,
    captchaToken,
    turnstileRef,
    canSubmit,
    getTokenForRequest,
    handleCaptchaSuccess,
    handleCaptchaError,
    handleCaptchaExpire,
    markAsVerified,
    handleApiError,
    shouldShowTurnstile,
  } = useCaptchaVerification({ apiUrl, turnstileSiteKey });

  const handleCapture = useCallback(
    async (url: string) => {
      if (!canSubmit) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await captureScreenshot(url, getTokenForRequest(), apiUrl);
        setResult(data);
        markAsVerified();
      } catch (err) {
        handleApiError(err);
        setError(err instanceof Error ? err.message : 'Failed to capture screenshot');
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, canSubmit, getTokenForRequest, markAsVerified, handleApiError]
  );

  const isDisabled = !canSubmit || isLoading;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <UrlInput onSubmit={handleCapture} isLoading={isLoading} disabled={isDisabled} />

      <PresetButtons onSelect={handleCapture} isLoading={isLoading} disabled={isDisabled} />

      {shouldShowTurnstile && (
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey!}
          onSuccess={handleCaptchaSuccess}
          onError={handleCaptchaError}
          onExpire={handleCaptchaExpire}
        />
      )}

      {turnstileSiteKey && (
        <CaptchaStatus
          checkingStatus={checkingStatus}
          isVerified={isVerified}
          hasCaptchaToken={!!captchaToken}
          readyMessage="Ready to capture"
          pendingMessage="Complete the verification above to enable screenshot"
        />
      )}

      <StatsBar
        captureTime={result?.captureTime ?? null}
        imageSize={result?.imageSize ?? null}
        dimensions={result?.dimensions ?? null}
      />

      <ResultPreview isLoading={isLoading} error={error} imageUrl={result?.imageUrl ?? null} />
    </div>
  );
}
