/**
 * [PROPS]: LoginFormProps
 * [EMITS]: onSuccess
 * [POS]: 统一登录表单组件
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Link02Icon, Loading01Icon } from '@hugeicons/core-free-icons';
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
} from '@aiget/ui';
import { cn } from '@aiget/ui/lib';
import { authClient } from '@/lib/auth-client';

const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export interface LoginFormProps extends React.ComponentProps<'div'> {
  /** 渲染形态：page（带 Card/品牌）或 dialog（用于全局弹窗） */
  variant?: 'page' | 'dialog';
  /** 登录成功回调 */
  onSuccess?: () => void;
  /** 切换到注册 */
  onRequestRegister?: () => void;
  /** 切换到忘记密码 */
  onRequestForgotPassword?: () => void;
}

export function LoginForm({
  className,
  variant = 'page',
  onSuccess,
  onRequestRegister,
  onRequestForgotPassword,
  ...props
}: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        throw new Error(authError.message ?? 'Login failed');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {variant === 'page' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Icon icon={Link02Icon} className="size-8" />
              <h1 className="font-mono text-2xl font-bold">Aiget</h1>
            </div>
            <p className="text-balance text-sm text-muted-foreground">Sign in to your account</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-4">
          <FormField
            control={form.control}
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
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <button
                    type="button"
                    onClick={onRequestForgotPassword}
                    disabled={!onRequestForgotPassword || isLoading}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onRequestRegister}
            disabled={!onRequestRegister || isLoading}
            className="font-medium text-foreground hover:underline disabled:opacity-50"
          >
            Sign up
          </button>
        </div>
      </form>
    </Form>
  );

  if (variant === 'dialog') {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden border-border">
        <CardContent className="p-6 md:p-8">{content}</CardContent>
      </Card>
    </div>
  );
}
