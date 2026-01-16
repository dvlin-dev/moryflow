/**
 * [PROPS]: ForgotPasswordFormProps
 * [EMITS]: onSuccess
 * [POS]: 密码重置表单（使用 Email OTP）
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Link02Icon,
  Loading01Icon,
  Mail01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import {
  Button,
  Card,
  CardContent,
  Icon,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@anyhunt/ui';
import { cn } from '@anyhunt/ui/lib';
import { authClient } from '@/lib/auth-client';

// 邮箱表单 Schema
const emailFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

// 重置密码表单 Schema
const resetFormSchema = z
  .object({
    otp: z.string().length(6, 'Verification code must be 6 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type EmailFormValues = z.infer<typeof emailFormSchema>;
type ResetFormValues = z.infer<typeof resetFormSchema>;

export interface ForgotPasswordFormProps extends React.ComponentProps<'div'> {
  /** 渲染形态：page（带 Card/品牌）或 dialog（用于全局弹窗） */
  variant?: 'page' | 'dialog';
  /** 重置成功回调 */
  onSuccess?: () => void;
  /** 返回登录 */
  onRequestSignIn?: () => void;
}

type Step = 'email' | 'verify' | 'success';

export function ForgotPasswordForm({
  className,
  variant = 'page',
  onSuccess,
  onRequestSignIn,
  ...props
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onEmailSubmit = async (values: EmailFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.forgetPassword.emailOtp({
        email: values.email,
      });

      if (authError) {
        throw new Error(authError.message ?? 'Failed to send verification code');
      }

      setEmail(values.email);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (values: ResetFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.emailOtp.resetPassword({
        email,
        otp: values.otp,
        password: values.password,
      });

      if (authError) {
        throw new Error(authError.message ?? 'Failed to reset password');
      }

      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.forgetPassword.emailOtp({
        email,
      });

      if (authError) {
        throw new Error(authError.message ?? 'Failed to resend code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // 成功状态
  if (step === 'success') {
    const successContent = (
      <div className="space-y-6">
        {variant === 'page' ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Icon icon={CheckmarkCircle02Icon} className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold">Password reset</h1>
              <p className="mt-2 text-balance text-sm text-muted-foreground">
                Your password has been successfully reset
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your password has been successfully reset.
          </p>
        )}

        <Button
          type="button"
          className="w-full font-mono"
          onClick={() => onRequestSignIn?.()}
          disabled={!onRequestSignIn}
        >
          Sign in
        </Button>
      </div>
    );

    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        {variant === 'dialog' ? (
          successContent
        ) : (
          <Card className="overflow-hidden border-border">
            <CardContent className="p-6 md:p-8">{successContent}</CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 验证 OTP 并设置新密码
  if (step === 'verify') {
    const resetContent = (
      <Form key="reset-form" {...resetForm}>
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
          {variant === 'page' ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon icon={Mail01Icon} className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-mono text-2xl font-bold">Check your email</h1>
              <p className="text-balance text-sm text-muted-foreground">
                We sent a verification code to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              We sent a verification code to <strong>{email}</strong>
            </p>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-4">
            <FormField
              control={resetForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      disabled={isLoading}
                      className="text-center font-mono text-lg tracking-widest"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full font-mono" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isLoading}
              className="font-medium text-foreground hover:underline disabled:opacity-50"
            >
              Resend
            </button>
          </div>
        </form>
      </Form>
    );

    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        {variant === 'dialog' ? (
          resetContent
        ) : (
          <Card className="overflow-hidden border-border">
            <CardContent className="p-6 md:p-8">{resetContent}</CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 输入邮箱
  const emailContent = (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
        {variant === 'page' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Icon icon={Link02Icon} className="size-8" />
              <h1 className="font-mono text-2xl font-bold">Anyhunt</h1>
            </div>
            <p className="text-balance text-sm text-muted-foreground">
              Enter your email to reset your password
            </p>
          </div>
        )}

        {variant === 'dialog' && (
          <p className="text-sm text-muted-foreground">Enter your email to receive a code.</p>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-4">
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full font-mono" disabled={isLoading}>
            {isLoading ? (
              <>
                <Icon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => onRequestSignIn?.()}
            disabled={!onRequestSignIn || isLoading}
            className="font-medium text-foreground hover:underline disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {variant === 'dialog' ? (
        emailContent
      ) : (
        <Card className="overflow-hidden border-border">
          <CardContent className="p-6 md:p-8">{emailContent}</CardContent>
        </Card>
      )}
    </div>
  );
}
