/**
 * [PROPS]: OTPFormProps - { email, onSuccess, onBack }
 * [EMITS]: onSuccess, onBack
 * [POS]: 邮箱验证码验证表单（设置弹窗 Account 注册第二步）
 * [UPDATE]: 2026-02-24 - 移除内层 form，改为显式提交 + Enter 捕获；onSuccess 改为 await 防止未处理 Promise
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@anyhunt/ui/components/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@anyhunt/ui/components/field';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@anyhunt/ui/components/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@anyhunt/ui/components/input-otp';
import { emailOtp } from '@/lib/server/client';

interface OTPFormProps extends React.ComponentProps<'div'> {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

type OTPFormValues = {
  otp: string;
};

const RESEND_COOLDOWN = 60;

export function OTPForm({ className, email, onSuccess, onBack, ...props }: OTPFormProps) {
  const { t } = useTranslation('auth');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(RESEND_COOLDOWN);

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
      const { error: verifyError } = await emailOtp.verifyEmail({
        email,
        otp: values.otp,
      });

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
      const { error: sendError } = await emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });

      if (sendError) {
        form.setError('otp', { message: sendError.message || t('sendFailed') });
        return;
      }

      setCountdown(RESEND_COOLDOWN);
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
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div>
        <Form {...formProviderProps}>
          <div onKeyDownCapture={handleEnterSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-xl font-bold">{t('verifyEmail')}</h1>
                <FieldDescription>
                  {t('otpSentToEmail')} <span className="font-medium text-foreground">{email}</span>
                </FieldDescription>
              </div>
              <FormField
                control={formControl}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor="otp" className="sr-only">
                      {t('verificationCodeLabel')}
                    </FieldLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        id="otp"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isVerifying}
                        containerClassName="gap-4"
                      >
                        <InputOTPGroup className="gap-2.5 data-[slot=input-otp-slot]:*:h-16 data-[slot=input-otp-slot]:*:w-12 data-[slot=input-otp-slot]:*:rounded-md data-[slot=input-otp-slot]:*:border data-[slot=input-otp-slot]:*:text-xl">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup className="gap-2.5 data-[slot=input-otp-slot]:*:h-16 data-[slot=input-otp-slot]:*:w-12 data-[slot=input-otp-slot]:*:rounded-md data-[slot=input-otp-slot]:*:border data-[slot=input-otp-slot]:*:text-xl">
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage className="text-center" />
                    <FieldDescription className="text-center">
                      {t('noCodeQuestion')}{' '}
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {isResending ? t('sendingOtp') : t('resendOtp')}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('resendInSeconds', { seconds: countdown })}
                        </span>
                      )}
                    </FieldDescription>
                  </FormItem>
                )}
              />
              <Field>
                <Button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={isVerifying || form.getValues('otp').length !== 6}
                >
                  {isVerifying && (
                    <span className="mr-2 size-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                  )}
                  {t('verifyButton')}
                </Button>
              </Field>
              {onBack && (
                <Field>
                  <Button type="button" variant="ghost" onClick={onBack}>
                    {t('backButton')}
                  </Button>
                </Field>
              )}
            </FieldGroup>
          </div>
        </Form>
      </div>
    </div>
  );
}
