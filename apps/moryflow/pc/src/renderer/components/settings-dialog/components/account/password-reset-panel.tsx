import { useMemo, useState, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@moryflow/ui/components/field';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import { useTranslation } from '@/lib/i18n';
import { resetPasswordWithOTP, sendForgotPasswordOTP } from '@/lib/server';

type PasswordResetPanelProps = {
  initialEmail?: string;
  onSuccess?: (email: string) => void;
  onBack?: () => void;
};

type PasswordResetFormValues = {
  email: string;
  otp: string;
  password: string;
};

const PASSWORD_MIN_LENGTH = 8;

export const PasswordResetPanel = ({
  initialEmail = '',
  onSuccess,
  onBack,
}: PasswordResetPanelProps) => {
  const { t } = useTranslation('auth');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [codeSentEmail, setCodeSentEmail] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
        otp: z.string().length(6, t('enterFullOtp')),
        password: z.string().min(PASSWORD_MIN_LENGTH, t('passwordTooShort')),
      }),
    [t]
  );

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: initialEmail,
      otp: '',
      password: '',
    },
  });

  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];

  const handleSendCode = async () => {
    const email = form.getValues('email').trim();
    form.clearErrors();

    const parsed = z.string().email(t('emailInvalid')).safeParse(email);
    if (!parsed.success) {
      form.setError('email', { message: t('emailInvalid') });
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await sendForgotPasswordOTP(email);
      if (result.error) {
        throw new Error(result.error.message || t('sendFailed'));
      }
      setCodeSentEmail(email);
      setIsCodeSent(true);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : t('sendFailed'),
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    setIsSubmitting(true);

    try {
      const targetEmail = codeSentEmail ?? values.email.trim();
      const result = await resetPasswordWithOTP(targetEmail, values.otp, values.password);
      if (result.error) {
        throw new Error(result.error.message || t('operationFailed'));
      }
      onSuccess?.(targetEmail);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : t('operationFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium">{t('forgotPasswordTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('forgotPasswordPageDescription')}</p>
      </div>

      <Form {...formProviderProps}>
        <FieldGroup>
          <FormField
            control={formControl}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FieldLabel htmlFor="reset-email">{t('email')}</FieldLabel>
                <FormControl>
                  <Input
                    id="reset-email"
                    type="email"
                    disabled={isCodeSent || isSendingCode || isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isCodeSent && (
            <>
              <FormField
                control={formControl}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor="reset-otp">{t('verificationCode')}</FieldLabel>
                    <FormControl>
                      <Input
                        id="reset-otp"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={isSubmitting}
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

              <FormField
                control={formControl}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor="reset-password">{t('password')}</FieldLabel>
                    <FormControl>
                      <Input
                        id="reset-password"
                        type="password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <Field className="gap-3">
            {!isCodeSent ? (
              <Button
                type="button"
                className="w-full"
                disabled={isSendingCode}
                onClick={() => void handleSendCode()}
              >
                {isSendingCode ? t('sending') : t('sendCode')}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => void handleResetPassword()}
                >
                  {isSubmitting ? t('sending') : t('resetPassword')}
                </Button>
                <FieldDescription className="text-center">
                  {t('verificationCodeSentTo', { email: codeSentEmail || form.watch('email') })}
                </FieldDescription>
              </>
            )}

            {onBack && (
              <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                {t('backToSignIn')}
              </Button>
            )}
          </Field>
        </FieldGroup>
      </Form>
    </div>
  );
};
