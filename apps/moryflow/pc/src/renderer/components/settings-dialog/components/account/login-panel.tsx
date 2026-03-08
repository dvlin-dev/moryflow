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
import { Form, FormField } from '@moryflow/ui/components/form';
import { useAuth, signUpWithEmail } from '@/lib/server';
import { OTPForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';
import { LoginPanelModeHeader } from './login-panel-mode-header';
import { LoginPanelAuthFields } from './login-panel-auth-fields';
import { LoginPanelTerms } from './login-panel-terms';
import type { AuthFormValues, AuthMode } from './login-panel.types';

type LoginPanelProps = {
  onSuccess?: () => void;
};

/**
 * 登录面板组件
 * 支持邮箱密码登录和注册（邮箱验证码验证）
 */
export const LoginPanel = ({ onSuccess }: LoginPanelProps) => {
  const { t } = useTranslation('auth');
  const { login, loginWithGoogle, refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showOTP, setShowOTP] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().optional(),
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(6, t('passwordTooShort')),
      }),
    [t]
  );

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];

  const isSubmitting = form.formState.isSubmitting || isGoogleSubmitting;
  const rootError = form.formState.errors.root?.message;

  const submitAuth = form.handleSubmit(async (values) => {
    form.clearErrors('root');

    try {
      if (mode === 'login') {
        await login(values.email.trim(), values.password);
        onSuccess?.();
        return;
      }

      if (!values.name?.trim()) {
        form.setError('name', { message: t('nicknameRequired') });
        return;
      }

      const result = await signUpWithEmail(
        values.email.trim(),
        values.password,
        values.name.trim()
      );

      if (!result) {
        throw new Error('Sign up failed');
      }

      if (result.error) {
        throw new Error(result.error.message || t('operationFailed'));
      }

      setShowOTP(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('operationFailed');
      form.setError('root', { message });
    }
  });

  const handleOTPSuccess = async () => {
    const established = await refresh();
    if (!established) {
      throw new Error(t('operationFailed'));
    }
    onSuccess?.();
  };

  const handleOTPBack = () => {
    setShowOTP(false);
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
    void submitAuth();
  };

  const isFormValid = Boolean(form.watch('email').trim() && form.watch('password').trim());

  if (showOTP) {
    return (
      <div className="mx-auto max-w-md">
        <OTPForm
          email={form.getValues('email')}
          onSuccess={handleOTPSuccess}
          onBack={handleOTPBack}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <LoginPanelModeHeader mode={mode} />

      <Form {...formProviderProps}>
        <div onKeyDownCapture={handleEnterSubmit}>
          <LoginPanelAuthFields
            mode={mode}
            formControl={formControl}
            isSubmitting={isSubmitting}
            rootError={rootError}
            isFormValid={isFormValid}
            onSubmit={() => void submitAuth()}
            onGoogleSignIn={() => void handleGoogleSignIn()}
            onSwitchMode={setMode}
          />
        </div>
      </Form>

      <LoginPanelTerms />
    </div>
  );
};
