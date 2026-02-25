/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Settings 页面 - 账户设置（Lucide icons direct render）
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Key, Shield, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@moryflow/ui';
import { PageHeader } from '@moryflow/ui';
import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  profileSettingsSchema,
  profileSettingsDefaults,
  securitySettingsSchema,
  securitySettingsDefaults,
  type ProfileSettingsFormValues,
  type SecuritySettingsFormValues,
} from '@/features/settings';

function getProfileSubmitLabel(isPending: boolean): string {
  if (isPending) {
    return 'Saving...';
  }
  return 'Save Changes';
}

function getPasswordSubmitLabel(isPending: boolean): string {
  if (isPending) {
    return 'Changing...';
  }
  return 'Change Password';
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account settings and preferences" />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSettings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: profileSettingsDefaults,
  });

  useEffect(() => {
    form.reset({
      name: profile?.name ?? '',
    });
  }, [form, profile?.name]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const trimmedName = values.name.trim();

    try {
      await updateProfile.mutateAsync({ name: trimmedName || undefined });
      toast.success('Profile updated');
      form.reset({ name: trimmedName });
    } catch {
      toast.error('Update failed');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Display Name</FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Current Plan</Label>
              <Input value={profile?.subscriptionTier ?? ''} disabled className="bg-muted" />
            </div>

            <Separator />

            <Button type="submit" disabled={updateProfile.isPending}>
              {getProfileSubmitLabel(updateProfile.isPending)}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const changePassword = useChangePassword();
  const form = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: securitySettingsDefaults,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const { currentPassword, newPassword } = values;

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      form.reset(securitySettingsDefaults);
    } catch {
      toast.error('Failed to change password');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Regularly changing your password improves account security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
                  <FormControl>
                    <Input id="currentPassword" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="newPassword">New Password</FormLabel>
                  <FormControl>
                    <Input id="newPassword" type="password" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input id="confirmPassword" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <Button type="submit" disabled={changePassword.isPending}>
              {getPasswordSubmitLabel(changePassword.isPending)}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
