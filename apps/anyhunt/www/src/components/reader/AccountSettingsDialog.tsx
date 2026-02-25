/**
 * [PROPS]: open, onOpenChange
 * [POS]: Reader 内账户设置弹窗（避免跳转到 /settings）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@moryflow/ui';
import { authMethods } from '@/lib/auth/auth-methods';
import { useAuthStore } from '@/stores/auth-store';
import { ResponsiveDialog } from './ResponsiveDialog';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsDialog({ open, onOpenChange }: AccountSettingsDialogProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Account settings"
      description="Manage your account and developer tools."
      className="sm:max-w-lg"
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Email</div>
              <div className="text-sm">{user.email}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <div className="text-sm">{user.name || 'Not set'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developer tools</CardTitle>
            <CardDescription>API keys and usage</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="https://console.anyhunt.app" target="_blank" rel="noopener noreferrer">
                Open console
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://docs.anyhunt.app" target="_blank" rel="noopener noreferrer">
                Read docs
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Sign out</CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Sign out</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>You can sign back in anytime.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      onOpenChange(false);
                      await authMethods.logout();
                      window.location.href = '/welcome';
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </ResponsiveDialog>
  );
}
