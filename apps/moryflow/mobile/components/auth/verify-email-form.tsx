/**
 * [PROPS]: useLocalSearchParams - email, mode ('signin' | 'signup')
 * [EMITS]: 验证成功后登录并跳转首页
 * [POS]: 邮箱验证码表单
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { sendVerificationOTP, verifyEmailOTP, useMembership } from '@/lib/server';

const RESEND_COOLDOWN = 60;

type VerifyEmailFormValues = {
  otp: string;
};

export function VerifyEmailForm() {
  const { t } = useTranslation('auth');
  const { login, getPendingSignup, clearPendingSignup } = useMembership();
  const params = useLocalSearchParams<{
    email?: string;
    mode?: 'signin' | 'signup';
  }>();

  const email = params.email || '';
  const mode = params.mode || 'signup';

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);

  const schema = useMemo(
    () =>
      z.object({
        otp: z.string().length(6, t('enterSixDigitCode')),
      }),
    [t]
  );

  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
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
      if (!email) {
        form.setError('otp', { message: t('emailRequired') });
        return;
      }
      const { error: verifyError } = await verifyEmailOTP(email, values.otp);
      if (verifyError) {
        form.setError('otp', { message: verifyError.message || t('codeInvalid') });
        return;
      }

      const pending = getPendingSignup();
      if (!pending) {
        form.setError('otp', { message: t('verificationFailed') });
        return;
      }

      await login(pending.email, pending.password);
      clearPendingSignup();
      router.replace('/');
    } catch {
      form.setError('otp', { message: t('verificationFailed') });
    } finally {
      setIsVerifying(false);
    }
  });

  const handleResend = useCallback(async () => {
    setIsResending(true);
    form.clearErrors('otp');
    try {
      if (!email) {
        form.setError('otp', { message: t('emailRequired') });
        return;
      }
      const { error: sendError } = await sendVerificationOTP(email, 'email-verification');
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
  }, [email, form, t]);

  const canResend = countdown <= 0 && !isResending;

  useEffect(() => {
    if (mode !== 'signin' || !email) {
      return;
    }
    void handleResend();
  }, [email, handleResend, mode]);

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">
            {t('verifyEmailTitle')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('verificationCodeSentTo', { email: email || t('email') })}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <Form {...form}>
            <View className="gap-4">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={t('enterSixDigitCode')}
                        value={field.value}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                          field.onChange(cleaned);
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!isVerifying}
                        className="text-center text-2xl tracking-[0.5em]"
                      />
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <Text className="text-muted-foreground text-center text-sm">
                {t('noCodeReceived')}{' '}
                {canResend ? (
                  <Text onPress={handleResend} className="text-primary">
                    {isResending ? t('sending') : t('resendCode')}
                  </Text>
                ) : (
                  <Text>{t('canResendIn', { seconds: countdown })}</Text>
                )}
              </Text>

              <Button
                onPress={handleVerify}
                disabled={isVerifying || form.getValues('otp').length !== 6}
                className="w-full">
                {isVerifying ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-semibold">{t('verify')}</Text>
                )}
              </Button>

              <Button variant="outline" onPress={() => router.back()} className="w-full">
                <Text className="font-semibold">
                  {t('backTo', { mode: mode === 'signup' ? t('signUp') : t('signIn') })}
                </Text>
              </Button>
            </View>
          </Form>
        </CardContent>
      </Card>
    </View>
  );
}
