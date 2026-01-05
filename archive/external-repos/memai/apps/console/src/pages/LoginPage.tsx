/**
 * 登录页面
 * 使用 LoginForm 组件
 */
import { LoginForm } from '@/features/auth'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
