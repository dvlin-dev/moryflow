/**
 * [PROPS]: OTPFormProps - { email, onSuccess, onBack }
 * [EMITS]: onSuccess, onBack
 * [POS]: 邮箱验证码验证表单（设置弹窗 Account 注册第二步）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@moryflow/ui/components/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@moryflow/ui/components/field';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@moryflow/ui/components/form';
import { Input } from '@moryflow/ui/components/input';
import { sendVerificationOTP, verifyEmailOTP } from '@/lib/server/auth-api';

interface OTPFormProps extends React.ComponentProps<'div'> {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
  resendCooldownSeconds?: number;
}

type OTPFormValues = {
  otp: string;
};

const RESEND_COOLDOWN = 60;

export function OTPForm({
  className,
  email,
  onSuccess,
  onBack,
  resendCooldownSeconds = RESEND_COOLDOWN,
  ...props
}: OTPFormProps) {
  const { t } = useTranslation('auth');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(resendCooldownSeconds);

  const schema = React.useMemo(
    () =>
      z.object({
        otp: z.string().length(6, t('enterFullOtp')),
      }),
    [t]
  );

  const form = useForm<OTPFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
  });
  // 规避 workspace 内 react-hook-form 类型来源不一致导致的类型冲突
  const formProviderProps = form as unknown as React.ComponentProps<typeof Form>;
  const formControl = form.control as unknown as React.ComponentProps<typeof FormField>['control'];

  // 倒计时
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = form.handleSubmit(async (values) => {
    setIsVerifying(true);
    form.clearErrors('otp');

    try {
      const { error: verifyError } = await verifyEmailOTP(email, values.otp);

      if (verifyError) {
        form.setError('otp', { message: verifyError.message || t('otpError') });
        return;
      }

      await onSuccess?.();
    } catch (err) {
      form.setError('otp', { message: err instanceof Error ? err.message : t('verifyFailed') });
    } finally {
      setIsVerifying(false);
    }
  });

  // 重发验证码
  async function handleResend() {
    setIsResending(true);
    form.clearErrors('otp');

    try {
      const { error: sendError } = await sendVerificationOTP(email, 'email-verification');

      if (sendError) {
        form.setError('otp', { message: sendError.message || t('sendFailed') });
        return;
      }

      setCountdown(resendCooldownSeconds);
    } catch {
      form.setError('otp', { message: t('sendFailedRetry') });
    } finally {
      setIsResending(false);
    }
  }

  const canResend = countdown <= 0 && !isResending;

  const handleEnterSubmit = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'TEXTAREA') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void handleVerify();
  };

  return (
    <div className={cn('space-y-6', className)} {...props}>
      <div className="text-center">
        <h3 className="text-lg font-medium">{t('verifyEmailTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('verificationCodeSentTo', { email })}
        </p>
      </div>

      <Form {...formProviderProps}>
        <div onKeyDownCapture={handleEnterSubmit}>
          <FieldGroup>
            <FormField
              control={formControl}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor="otp">{t('verificationCodeLabel')}</FieldLabel>
                  <FormControl>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      disabled={isVerifying}
                      {...field}
                      onChange={(event) => {
                        const normalized = event.target.value.replace(/\D/g, '').slice(0, 6);
                        field.onChange(normalized);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Field className="gap-3">
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleVerify()}
                disabled={isVerifying || form.getValues('otp').length !== 6}
              >
                {isVerifying && (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                )}
                {t('verifyButton')}
              </Button>

              <FieldDescription className="text-center">
                {t('noCodeQuestion')}{' '}
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-primary hover:underline"
                  >
                    {isResending ? t('sendingOtp') : t('resendOtp')}
                  </button>
                ) : (
                  <span>{t('resendInSeconds', { seconds: countdown })}</span>
                )}
              </FieldDescription>

              {onBack && (
                <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                  {t('backButton')}
                </Button>
              )}
            </Field>
          </FieldGroup>
        </div>
      </Form>
    </div>
  );
}
