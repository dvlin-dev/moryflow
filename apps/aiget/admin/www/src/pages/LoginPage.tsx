/**
 * [PROPS]: 无
 * [EMITS]: submit (form)
 * [POS]: Admin 登录页面（Better Auth + 管理员校验）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@aiget/ui';
import { useAuthStore } from '@/stores/auth';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import { USER_API } from '@/lib/api-paths';

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  isAdmin: boolean;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await authClient.signIn.email({ email, password });

      if (signInError) {
        throw new Error(signInError.message ?? 'Login failed');
      }

      if (!data?.user) {
        throw new Error('Login failed');
      }

      const profile = await apiClient.get<UserProfile>(USER_API.ME);

      if (!profile.isAdmin) {
        try {
          await authClient.signOut();
        } catch {
          // 忽略登出失败
        }
        throw new Error('Admin access required');
      }

      setUser(profile);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Aiget Admin</CardTitle>
          <CardDescription>Sign in to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
