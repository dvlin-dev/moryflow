/**
 * [PROPS]: LoginPanelProps
 * [EMITS]: onSuccess
 * [POS]: 设置弹窗 - Account 登录/注册面板（邮箱密码 + 注册验证码）
 * [UPDATE]: 2026-02-09 - 阻止 submit 事件冒泡到 SettingsDialog，避免设置弹窗意外保存/关闭
 * [UPDATE]: 2026-02-24 - 移除嵌套 form，改为显式提交 + Enter 捕获，规避外层 Settings form 被意外触发
 * [UPDATE]: 2026-02-24 - 登录仅按钮级 loading；验证码成功后直接 refresh 当前用户（不再二次登录）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@anyhunt/ui/components/button';
import { Input } from '@anyhunt/ui/components/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@anyhunt/ui/components/field';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@anyhunt/ui/components/form';
import { useAuth, signUpWithEmail } from '@/lib/server';
import { OTPForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';

type LoginPanelProps = {
  onSuccess?: () => void;
};

type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};

/**
 * 登录面板组件
 * 支持邮箱密码登录和注册（邮箱验证码验证）
 */
export const LoginPanel = ({ onSuccess }: LoginPanelProps) => {
  const { t } = useTranslation('auth');
  const { login, refresh } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showOTP, setShowOTP] = useState(false);

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
  // 规避 workspace 内 react-hook-form 类型来源不一致导致的类型冲突
  const formProviderProps = form as unknown as React.ComponentProps<typeof Form>;
  const formControl = form.control as unknown as React.ComponentProps<typeof FormField>['control'];

  const isSubmitting = form.formState.isSubmitting;
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
    void submitAuth();
  };

  const isFormValid = form.watch('email').trim() && form.watch('password').trim();

  // 显示验证码输入
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
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium">
          {mode === 'login' ? t('welcomeBackTitle') : t('createAccountTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'login' ? t('signInToCloudService') : t('signUpToMoryflow')}
        </p>
      </div>

      <Form {...formProviderProps}>
        <div onKeyDownCapture={handleEnterSubmit}>
          <FieldGroup>
            {/* OAuth 登录按钮 - 暂时禁用 */}
            <Field>
              <Button variant="outline" type="button" disabled className="w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="mr-2 h-4 w-4"
                >
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                    fill="currentColor"
                  />
                </svg>
                {t('appleSignInComingSoon')}
              </Button>
              <Button variant="outline" type="button" disabled className="w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="mr-2 h-4 w-4"
                >
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                {t('googleSignInComingSoon')}
              </Button>
            </Field>

            <FieldSeparator>{t('orUseEmail')}</FieldSeparator>

            {mode === 'register' && (
              <FormField
                control={formControl}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel htmlFor="name">{t('nickname')}</FieldLabel>
                    <FormControl>
                      <Input
                        id="name"
                        type="text"
                        placeholder={t('nicknamePlaceholder')}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={formControl}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      disabled={isSubmitting}
                      {...field}
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
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                    {mode === 'login' && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        disabled
                      >
                        {t('forgotPasswordComingSoon')}
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError && <p className="text-sm text-destructive">{rootError}</p>}

            <Field>
              <Button
                type="button"
                disabled={isSubmitting || !isFormValid}
                className="w-full"
                onClick={() => void submitAuth()}
              >
                {isSubmitting && (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                )}
                {mode === 'login' ? t('signIn') : t('signUp')}
              </Button>
              <FieldDescription className="text-center">
                {mode === 'login' ? (
                  <>
                    {t('noAccountQuestion')}{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setMode('register')}
                    >
                      {t('signUpNow')}
                    </button>
                  </>
                ) : (
                  <>
                    {t('haveAccountQuestion')}{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setMode('login')}
                    >
                      {t('backToSignInAction')}
                    </button>
                  </>
                )}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      </Form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('agreeToTerms')}{' '}
        <a href="#" className="hover:underline">
          {t('termsOfService')}
        </a>{' '}
        {t('and')}{' '}
        <a href="#" className="hover:underline">
          {t('privacyPolicyLink')}
        </a>
      </p>
    </div>
  );
};
