/**
 * LoginForm - 管理员登录表单组件
 * 通过 /api/v1/auth/* 完成登录与刷新
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authMethods } from '@/lib/auth/auth-methods';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

export type LoginFormProps = React.ComponentProps<'div'>;

export function LoginForm({ className, ...props }: LoginFormProps) {
  const navigate = useNavigate();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isLoading = form.formState.isSubmitting;
  const rootError = useMemo(
    () => form.formState.errors.root?.message,
    [form.formState.errors.root?.message]
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await authMethods.signIn(values.email.trim(), values.password.trim());
      toast.success('Signed in successfully');
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      form.setError('root', { message });
      toast.error(message);
    }
  });

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Moryflow</h1>
                <p className="text-muted-foreground text-balance text-sm">管理后台登录</p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>管理员邮箱</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
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
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {rootError ? <p className="text-sm text-destructive">{rootError}</p> : null}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                      Signing in...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
