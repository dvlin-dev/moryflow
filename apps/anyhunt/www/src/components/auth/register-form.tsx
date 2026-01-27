/**
 * [PROPS]: RegisterFormProps
 * [EMITS]: onSuccess
 * [POS]: 注册表单组件（支持 Email OTP 验证，Lucide icons direct render）
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Link, Loader, Mail } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
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
import { refreshAccessToken } from '@/lib/auth-session';

// 注册表单 Schema
const registerFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// OTP 验证 Schema
const otpFormSchema = z.object({
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

export interface RegisterFormProps extends React.ComponentProps<'div'> {
  /** 渲染形态：page（带 Card/品牌）或 dialog（用于全局弹窗） */
  variant?: 'page' | 'dialog';
  /** 注册成功回调 */
  onSuccess?: () => void;
  /** 切换到登录 */
  onRequestSignIn?: () => void;
}

type Step = 'form' | 'verify';

export function RegisterForm({
  className,
  variant = 'page',
  onSuccess,
  onRequestSignIn,
  ...props
}: RegisterFormProps) {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: '',
    },
  });

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name?.trim() || values.email.split('@')[0],
      });

      if (authError) {
        throw new Error(authError.message ?? 'Registration failed');
      }

      // 保存 email 用于 OTP 验证
      setEmail(values.email);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (values: OtpFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: values.otp,
      });

      if (verifyError) {
        throw new Error(verifyError.message ?? 'Verification failed');
      }

      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        throw new Error('Failed to refresh session');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });

      if (resendError) {
        throw new Error(resendError.message ?? 'Failed to resend code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP 验证步骤
  if (step === 'verify') {
    const otpContent = (
      <Form key="otp-form" {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
          {variant === 'page' ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
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
              control={otpForm.control}
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

            <Button type="submit" className="w-full font-mono" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
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
          otpContent
        ) : (
          <Card className="overflow-hidden border-border">
            <CardContent className="p-6 md:p-8">{otpContent}</CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 注册表单步骤
  const registerContent = (
    <Form {...registerForm}>
      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
        {variant === 'page' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Link className="size-8" />
              <h1 className="font-mono text-2xl font-bold">Anyhunt</h1>
            </div>
            <p className="text-balance text-sm text-muted-foreground">Create your account</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-4">
          <FormField
            control={registerForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={registerForm.control}
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

          <FormField
            control={registerForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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

          <Button type="submit" className="w-full font-mono" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onRequestSignIn}
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
        registerContent
      ) : (
        <Card className="overflow-hidden border-border">
          <CardContent className="p-6 md:p-8">{registerContent}</CardContent>
        </Card>
      )}
    </div>
  );
}
