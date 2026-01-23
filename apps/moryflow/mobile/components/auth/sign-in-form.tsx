/**
 * [PROPS]: 无
 * [EMITS]: 登录成功后跳转首页或返回
 * [POS]: 移动端登录表单
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { PASSWORD_CONFIG, isAuthError, useMembershipAuth } from '@/lib/server';

type SignInFormValues = {
  email: string;
  password: string;
};

export function SignInForm() {
  const { t } = useTranslation('auth');
  const { login, isLoading } = useMembershipAuth();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('emailInvalid')),
        password: z.string().min(PASSWORD_CONFIG.MIN_LENGTH, t('passwordTooShort')),
      }),
    [t]
  );

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const isSubmitting = isLoading || form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await login(values.email, values.password);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (err) {
      if (isAuthError(err) && err.code === 'EMAIL_NOT_VERIFIED') {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: values.email, mode: 'signin' },
        });
        return;
      }
      const message = err instanceof Error ? err.message : t('signInFailed');
      form.setError('root', { message });
    }
  });

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">
            {t('signInToMoryFlow')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">{t('welcomeBack')}</CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <Form {...form}>
            <View className="gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="m@example.com"
                        keyboardType="email-address"
                        autoComplete="email"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                        returnKeyType="next"
                        onSubmitEditing={() => form.setFocus('password')}
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
                    <FormLabel>{t('password')}</FormLabel>
                    <FormControl>
                      <Input
                        secureTextEntry
                        placeholder={t('enterPassword')}
                        autoComplete="password"
                        editable={!isSubmitting}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </View>
          </Form>

          {rootError ? (
            <Text className="text-destructive text-sm font-medium">{rootError}</Text>
          ) : null}

          <Button onPress={handleSubmit} disabled={isSubmitting} className="web:w-full">
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="font-semibold">{t('signIn')}</Text>
            )}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-muted-foreground text-sm">{t('noAccount')}</Text>
            <Link asChild href="/(auth)/sign-up">
              <Button variant="link" size="sm" className="web:h-fit h-4 px-1 py-0 sm:h-4">
                <Text>{t('signUp')}</Text>
              </Button>
            </Link>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
