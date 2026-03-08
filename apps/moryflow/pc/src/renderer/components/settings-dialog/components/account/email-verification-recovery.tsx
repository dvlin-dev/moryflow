import { useState } from 'react';
import { Button } from '@moryflow/ui/components/button';
import { OTPForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';
import { sendVerificationOTP, useAuth } from '@/lib/server';

type EmailVerificationRecoveryProps = {
  email: string;
};

export const EmailVerificationRecovery = ({ email }: EmailVerificationRecoveryProps) => {
  const { t } = useTranslation('auth');
  const { refresh } = useAuth();
  const [showOTP, setShowOTP] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsSending(true);
    setError(null);

    try {
      const result = await sendVerificationOTP(email, 'email-verification');
      if (result.error) {
        throw new Error(result.error.message || t('sendFailed'));
      }
      setShowOTP(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sendFailed'));
    } finally {
      setIsSending(false);
    }
  };

  if (showOTP) {
    return (
      <OTPForm
        email={email}
        onBack={() => setShowOTP(false)}
        onSuccess={async () => {
          const established = await refresh();
          if (!established) {
            throw new Error(t('operationFailed'));
          }
          setShowOTP(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-600">{t('emailNotVerified')}</p>
      <Button
        type="button"
        variant="ghost"
        className="h-auto px-0 text-xs text-foreground hover:text-foreground"
        disabled={isSending}
        onClick={() => void handleStart()}
      >
        {isSending ? t('sendingOtp') : t('verifyEmail')}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
