import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import type { ComponentProps } from 'react';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@moryflow/ui/components/field';
import { FormField, FormItem, FormControl, FormMessage } from '@moryflow/ui/components/form';
import { useTranslation } from '@/lib/i18n';
import type { AuthMode } from './login-panel.types';

type LoginPanelAuthFieldsProps = {
  mode: AuthMode;
  formControl: ComponentProps<typeof FormField>['control'];
  isSubmitting: boolean;
  rootError?: string;
  isFormValid: boolean;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onGoogleSignIn: () => void;
  onSwitchMode: (mode: AuthMode) => void;
};

const OAuthButtons = ({
  isSubmitting,
  onGoogleSignIn,
}: {
  isSubmitting: boolean;
  onGoogleSignIn: () => void;
}) => {
  const { t } = useTranslation('auth');

  return (
    <Field>
      <Button
        variant="outline"
        type="button"
        disabled={isSubmitting}
        className="w-full"
        onClick={onGoogleSignIn}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
          <path
            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
            fill="currentColor"
          />
        </svg>
        {t('signInWithGoogle')}
      </Button>
    </Field>
  );
};

const NameField = ({
  control,
  isSubmitting,
}: {
  control: ComponentProps<typeof FormField>['control'];
  isSubmitting: boolean;
}) => {
  const { t } = useTranslation('auth');

  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FieldLabel htmlFor="name">{t('nickname')}</FieldLabel>
          <FormControl>
            <Input
              id="name"
              type="text"
              placeholder={t('nicknamePlaceholder')}
              disabled={isSubmitting}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const EmailField = ({
  control,
  isSubmitting,
}: {
  control: ComponentProps<typeof FormField>['control'];
  isSubmitting: boolean;
}) => {
  const { t } = useTranslation('auth');

  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
          <FormControl>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              disabled={isSubmitting}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const PasswordField = ({
  mode,
  control,
  isSubmitting,
  onForgotPassword,
}: {
  mode: AuthMode;
  control: ComponentProps<typeof FormField>['control'];
  isSubmitting: boolean;
  onForgotPassword: () => void;
}) => {
  const { t } = useTranslation('auth');

  return (
    <FormField
      control={control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
            {mode === 'login' && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onForgotPassword}
              >
                {t('forgotPassword')}
              </button>
            )}
          </div>
          <FormControl>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isSubmitting}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const SubmitSection = ({
  mode,
  isSubmitting,
  isFormValid,
  onSubmit,
  onSwitchMode,
}: {
  mode: AuthMode;
  isSubmitting: boolean;
  isFormValid: boolean;
  onSubmit: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}) => {
  const { t } = useTranslation('auth');

  return (
    <Field>
      <Button
        type="button"
        disabled={isSubmitting || !isFormValid}
        className="w-full"
        onClick={onSubmit}
      >
        {isSubmitting && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        )}
        {mode === 'login' ? t('signIn') : t('signUp')}
      </Button>
      <FieldDescription className="text-center">
        {mode === 'login' ? (
          <>
            {t('noAccountQuestion')}{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onSwitchMode('register')}
            >
              {t('signUpNow')}
            </button>
          </>
        ) : (
          <>
            {t('haveAccountQuestion')}{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onSwitchMode('login')}
            >
              {t('backToSignInAction')}
            </button>
          </>
        )}
      </FieldDescription>
    </Field>
  );
};

export const LoginPanelAuthFields = ({
  mode,
  formControl,
  isSubmitting,
  rootError,
  isFormValid,
  onSubmit,
  onForgotPassword,
  onGoogleSignIn,
  onSwitchMode,
}: LoginPanelAuthFieldsProps) => {
  const control = formControl as ComponentProps<typeof FormField>['control'];
  const { t } = useTranslation('auth');

  return (
    <FieldGroup>
      <OAuthButtons isSubmitting={isSubmitting} onGoogleSignIn={onGoogleSignIn} />
      <FieldSeparator>{t('orUseEmail')}</FieldSeparator>
      {mode === 'register' && <NameField control={control} isSubmitting={isSubmitting} />}
      <EmailField control={control} isSubmitting={isSubmitting} />
      <PasswordField
        mode={mode}
        control={control}
        isSubmitting={isSubmitting}
        onForgotPassword={onForgotPassword}
      />
      {rootError && <p className="text-sm text-destructive">{rootError}</p>}
      <SubmitSection
        mode={mode}
        isSubmitting={isSubmitting}
        isFormValid={isFormValid}
        onSubmit={onSubmit}
        onSwitchMode={onSwitchMode}
      />
    </FieldGroup>
  );
};
