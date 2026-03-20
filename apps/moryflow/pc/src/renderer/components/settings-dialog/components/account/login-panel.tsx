/**
 * [PROPS]: LoginPanelProps
 * [EMITS]: onSuccess
 * [POS]: 设置弹窗 - Account 登录/注册面板（邮箱密码 + 注册验证码）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@moryflow/ui/components/button';
import { Field, FieldGroup, FieldLabel } from '@moryflow/ui/components/field';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import { Input } from '@moryflow/ui/components/input';
import { useAuth, completeEmailSignUp, startEmailSignUp } from '@/lib/server';
import { OTPForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';
import { LoginPanelAuthFields } from './login-panel-auth-fields';
import { LoginPanelTerms } from './login-panel-terms';
import { PasswordResetPanel } from './password-reset-panel';
import type { AuthFormValues, AuthMode } from './login-panel.types';

type LoginPanelProps = {
  onSuccess?: () => void;
};

const PASSWORD_MIN_LENGTH = 8;
type RegisterStep = 'email' | 'otp' | 'password';

/**
 * 登录面板组件
 * 支持邮箱密码登录和注册（邮箱验证码验证）
 */
export const LoginPanel = ({ onSuccess }: LoginPanelProps) => {
  const { t } = useTranslation('auth');
  const { login, loginWithGoogle, refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('email');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
        password: z.string().optional(),
      }),
    [t]
  );

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];
  const completeSchema = useMemo(
    () =>
      z.object({
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t]
  );
  const completeForm = useForm<{ password: string }>({
    resolver: zodResolver(completeSchema),
    defaultValues: { password: '' },
  });
  const completeFormProviderProps = completeForm as unknown as ComponentProps<typeof Form>;
  const completeControl = completeForm.control as unknown as ComponentProps<
    typeof FormField
  >['control'];

  const isSubmitting = form.formState.isSubmitting || isGoogleSubmitting;
  const rootError = form.formState.errors.root?.message;
  const completeRootError = completeForm.formState.errors.root?.message;

  const submitAuth = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    form.clearErrors('password');

    try {
      if (mode === 'login') {
        const password = values.password?.trim() ?? '';
        if (!password) {
          form.setError('password', { message: t('passwordRequired') });
          return;
        }

        await login(values.email.trim(), password);
        onSuccess?.();
        return;
      }

      const result = await startEmailSignUp(values.email.trim());

      if (result?.error) {
        throw new Error(result.error.message || t('operationFailed'));
      }

      setRegisterStep('otp');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('operationFailed');
      form.setError('root', { message });
    }
  });

  const handleOTPBack = () => {
    setRegisterStep('email');
  };

  const handleForgotPasswordSuccess = (email: string) => {
    form.setValue('email', email);
    form.setValue('password', '');
    setMode('login');
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSubmitting) {
      return;
    }

    form.clearErrors('root');
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('operationFailed');
      form.setError('root', { message });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleRegisterVerified = async (nextSignupToken: string) => {
    setSignupToken(nextSignupToken);
    completeForm.setValue('password', '');
    completeForm.clearErrors();
    setRegisterStep('password');
  };

  const handleCompleteSignUp = completeForm.handleSubmit(async (values) => {
    completeForm.clearErrors('root');

    if (values.password.length < PASSWORD_MIN_LENGTH) {
      completeForm.setError('password', { message: t('passwordTooShort') });
      return;
    }
    if (!signupToken) {
      completeForm.setError('root', { message: t('operationFailed') });
      return;
    }

    try {
      const result = await completeEmailSignUp(signupToken, values.password);
      if (result.error) {
        throw new Error(result.error.message || t('operationFailed'));
      }

      const established = await refresh();
      if (!established) {
        throw new Error(t('operationFailed'));
      }

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('operationFailed');
      completeForm.setError('root', { message });
    }
  });

  const handleSwitchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setRegisterStep('email');
    setSignupToken(null);
    form.clearErrors();
    completeForm.clearErrors();
  };

  const handleEnterSubmit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'TEXTAREA') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (mode === 'register' && registerStep === 'password') {
      if (!isCompleteValid) {
        return;
      }
      void handleCompleteSignUp();
      return;
    }

    if (!isFormValid) {
      if (mode === 'login' && !(form.getValues('password') ?? '').trim()) {
        form.setError('password', { message: t('passwordRequired') });
      }
      return;
    }

    void submitAuth();
  };

  const isFormValid =
    mode === 'login'
      ? Boolean(form.watch('email').trim() && (form.watch('password') ?? '').trim())
      : Boolean(form.watch('email').trim());
  const isCompleteValid = Boolean((completeForm.watch('password') ?? '').trim());

  if (mode === 'register' && registerStep === 'otp') {
    return (
      <OTPForm
        email={form.getValues('email')}
        onVerified={handleRegisterVerified}
        onBack={handleOTPBack}
      />
    );
  }

  if (mode === 'register' && registerStep === 'password') {
    return (
      <Form {...completeFormProviderProps}>
        <div onKeyDownCapture={handleEnterSubmit}>
          <FieldGroup>
            <FormField
              control={completeControl}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      disabled={completeForm.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {completeRootError ? (
              <p className="text-sm text-destructive">{completeRootError}</p>
            ) : null}
            <Field>
              <Button
                type="button"
                className="w-full"
                disabled={completeForm.formState.isSubmitting || !isCompleteValid}
                onClick={() => void handleCompleteSignUp()}
              >
                {t('signUp')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setRegisterStep('otp')}
              >
                {t('backButton')}
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </Form>
    );
  }

  if (mode === 'forgot-password') {
    return (
      <PasswordResetPanel
        initialEmail={form.getValues('email')}
        onSuccess={handleForgotPasswordSuccess}
        onBack={() => setMode('login')}
      />
    );
  }

  return (
    <div data-testid="auth-form-shell">
      <Form {...formProviderProps}>
        <div onKeyDownCapture={handleEnterSubmit}>
          <LoginPanelAuthFields
            mode={mode}
            formControl={formControl}
            isSubmitting={isSubmitting}
            rootError={rootError}
            isFormValid={isFormValid}
            showPassword={mode === 'login'}
            onSubmit={() => void submitAuth()}
            onForgotPassword={() => setMode('forgot-password')}
            onGoogleSignIn={() => void handleGoogleSignIn()}
            onSwitchMode={handleSwitchMode}
          />
        </div>
      </Form>

      <LoginPanelTerms />
    </div>
  );
};
