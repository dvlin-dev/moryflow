/**
 * [PROPS]: LoginFormProps
 * [EMITS]: submit (form)
 * [POS]: Console 登录表单（Better Auth + 用户档案）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import { USER_API } from '@/lib/api-paths';
import { cn } from '@aiget/ui/lib';
import { Button, Card, CardContent, Input, Label } from '@aiget/ui/primitives';
import { Link2, Loader2 } from 'lucide-react';

export type LoginFormProps = React.ComponentProps<'div'>;

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  isAdmin: boolean;
};

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({ email, password });

      if (error) {
        throw new Error(error.message ?? 'Login failed');
      }

      if (!data?.user) {
        throw new Error('Login failed');
      }

      const profile = await apiClient.get<UserProfile>(USER_API.ME);
      setUser(profile);
      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Login failed, please check your credentials'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2">
                <Link2 className="size-8" />
                <h1 className="text-2xl font-bold">Aiget</h1>
              </div>
              <p className="text-muted-foreground text-balance text-sm">Sign in to your account</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
