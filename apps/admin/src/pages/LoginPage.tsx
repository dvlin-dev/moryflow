/**
 * 登录页面
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';
import { api, setApiAccessToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentAdmin } from '@/types';

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    tier: 'FREE' | 'STARTER' | 'PRO' | 'MAX';
    isAdmin: boolean;
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAdmin, setAccessToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      // 登录
      const result = await api.post<LoginResponse>('/v1/auth/login', { email, password });

      setApiAccessToken(result.accessToken);
      setAccessToken(result.accessToken);

      // 获取当前用户信息
      const user = await api.get<CurrentAdmin>('/v1/auth/me');

      if (!user.isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        await api.post('/v1/auth/logout');
        setApiAccessToken(null);
        setAccessToken(null);
        setIsLoading(false);
        return;
      }

      setAdmin(user);
      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      setApiAccessToken(null);
      setAccessToken(null);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Aiget Admin</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
