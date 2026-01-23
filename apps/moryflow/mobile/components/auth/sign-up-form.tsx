/**
 * [PROPS]: 无
 * [EMITS]: 注册成功后跳转验证码验证页
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
import { PASSWORD_CONFIG, useMembershipAuth } from '@/lib/server';

type SignUpFormValues = {
  email: string;
  name: string;
  password: string;
};

export function SignUpForm() {
  const { t } = useTranslation('auth');
  const { t: tValidation } = useTranslation('validation');
  const { register, isLoading } = useMembershipAuth();
  const params = useLocalSearchParams();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('emailInvalid')),
        name: z.string().trim().min(1, t('nicknameRequired')),
        password: z.string().min(PASSWORD_CONFIG.MIN_LENGTH, t('passwordTooShort')),
      }),
    [t]
  );

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: (params.email as string) || '', name: '', password: '' },
  });

  const isSubmitting = isLoading || form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await register(values.email, values.password, values.name.trim());
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: values.email, mode: 'signup' },
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
                        returnKeyType="next"
                        onSubmitEditing={() => form.setFocus('name')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('nickname')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('nicknamePlaceholder')}
                        autoComplete="name"
                        autoCapitalize="words"
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
                        placeholder={t('createPassword')}
                        autoComplete="password-new"
                        editable={!isSubmitting}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <Text className="text-muted-foreground text-xs">
                      {tValidation('passwordMinLength', { min: PASSWORD_CONFIG.MIN_LENGTH })}
                    </Text>
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
