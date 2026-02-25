/**
 * [PROPS]: 无
 * [EMITS]: submit (RHF)
 * [POS]: Console 登录页面（Token-first）
 */
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@anyhunt/ui';
import { authMethods } from '@/lib/auth/auth-methods';

const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const resolveNextPath = (search: string): string => {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  if (next.startsWith('/login')) {
    return '/';
  }
  return next;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const nextPath = resolveNextPath(location.search);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await authMethods.signIn(values.email, values.password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Sign in failed',
      });
    }
  });

  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Anyhunt Console</CardTitle>
          <CardDescription>Sign in to access developer console</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" disabled={isSubmitting} {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {rootError && (
                <Alert variant="destructive">
                  <AlertDescription>{rootError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
