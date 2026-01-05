/**
 * LoginForm - 管理员登录表单组件
 * 使用 Bearer Token 认证，登录成功后保存 token 到 localStorage
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/lib/api-client'
import { ADMIN_API } from '@/lib/api-paths'
import { cn } from '@memai/ui/lib'
import { Button, Card, CardContent, Input, Label } from '@memai/ui/primitives'
import { Link2, Loader2 } from 'lucide-react'

interface LoginResponse {
  success: boolean
  user: {
    id: string
    email: string
    name?: string | null
    isAdmin: boolean
  }
  token: string
}

export type LoginFormProps = React.ComponentProps<'div'>

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password')
      return
    }

    setIsLoading(true)

    try {
      const data = await apiClient.post<LoginResponse>(ADMIN_API.LOGIN, {
        email,
        password,
      })

      if (data.success && data.user && data.token) {
        setAuth(data.user, data.token)
        toast.success('Login successful')
        navigate('/')
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Login failed, please check your credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2">
                <Link2 className="size-8" />
                <h1 className="text-2xl font-bold">Memory</h1>
              </div>
              <p className="text-muted-foreground text-balance text-sm">
                Sign in to your account
              </p>
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
  )
}
