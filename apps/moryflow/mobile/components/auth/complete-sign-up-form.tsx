import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PASSWORD_CONFIG, useMembershipAuth } from '@/lib/server';
import { PasswordStrengthIndicator } from './password-strength-indicator';

type CompleteSignUpFormProps = {
  signupToken: string;
  onBack: () => void;
  onSuccess: () => void;
};

type CompleteSignUpFormValues = {
  password: string;
};

export function CompleteSignUpForm({ signupToken, onBack, onSuccess }: CompleteSignUpFormProps) {
  const { t } = useTranslation('auth');
  const { t: tValidation } = useTranslation('validation');
  const { completeEmailSignUp, isLoading } = useMembershipAuth();

  const schema = useMemo(
    () =>
      z.object({
        password: z.string().min(PASSWORD_CONFIG.MIN_LENGTH, t('passwordTooShort')),
      }),
    [t]
  );

  const form = useForm<CompleteSignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  const rootError = form.formState.errors.root?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await completeEmailSignUp(signupToken, values.password);
      onSuccess();
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('signInFailed'),
      });
    }
  });

  return (
    <Form {...form}>
      <View className="gap-4">
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
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <Text className="text-muted-foreground text-xs">
                {tValidation('passwordMinLength', { min: PASSWORD_CONFIG.MIN_LENGTH })}
              </Text>
              <PasswordStrengthIndicator password={field.value} />
            </FormItem>
          )}
        />

        {rootError ? (
          <Text className="text-destructive text-sm font-medium">{rootError}</Text>
        ) : null}

        <Button onPress={handleSubmit} disabled={isLoading} className="w-full">
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="font-semibold">{t('createAccountButton')}</Text>
          )}
        </Button>

        <Button variant="outline" onPress={onBack} className="w-full">
          <Text className="font-semibold">{t('backTo', { mode: t('verify') })}</Text>
        </Button>
      </View>
    </Form>
  );
}
