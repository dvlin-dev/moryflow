/**
 * [PROPS]: 无
 * [EMITS]: 邮箱提交成功后跳转验证码验证页
 * [POS]: 移动端注册表单
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, useLocalSearchParams } from 'expo-router';
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
import { useMembershipAuth } from '@/lib/server';

type SignUpFormValues = {
  email: string;
};

export function SignUpForm() {
  const { t } = useTranslation('auth');
  const { register, isLoading } = useMembershipAuth();
  const params = useLocalSearchParams();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('emailInvalid')),
      }),
    [t]
  );

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: (params.email as string) || '' },
  });

  const isSubmitting = isLoading || form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await register(values.email);
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: values.email },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      form.setError('root', { message });
    }
  });

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">{t('createAccount')}</CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('signUpWelcome')}
          </CardDescription>
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
                        placeholder={t('emailPlaceholder')}
                        keyboardType="email-address"
                        autoComplete="email"
                        autoCapitalize="none"
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
              <Text className="font-semibold">{t('createAccountButton')}</Text>
            )}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-muted-foreground text-sm">{t('alreadyHaveAccount')}</Text>
            <Link asChild href="/(auth)/sign-in">
              <Button variant="link" size="sm" className="web:h-fit h-4 px-1 py-0 sm:h-4">
                <Text>{t('signIn')}</Text>
              </Button>
            </Link>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
