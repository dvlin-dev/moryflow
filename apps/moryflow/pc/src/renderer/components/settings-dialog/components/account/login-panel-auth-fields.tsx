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
  onSwitchMode: (mode: AuthMode) => void;
};

const OAuthButtons = () => {
  const { t } = useTranslation('auth');

  return (
    <Field>
      <Button variant="outline" type="button" disabled className="w-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
          <path
            d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
            fill="currentColor"
          />
        </svg>
        {t('appleSignInComingSoon')}
      </Button>
      <Button variant="outline" type="button" disabled className="w-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
          <path
            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
            fill="currentColor"
          />
        </svg>
        {t('googleSignInComingSoon')}
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
}: {
  mode: AuthMode;
  control: ComponentProps<typeof FormField>['control'];
  isSubmitting: boolean;
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
                disabled
              >
                {t('forgotPasswordComingSoon')}
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
      <Button type="button" disabled={isSubmitting || !isFormValid} className="w-full" onClick={onSubmit}>
        {isSubmitting && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        )}
        {mode === 'login' ? t('signIn') : t('signUp')}
      </Button>
      <FieldDescription className="text-center">
        {mode === 'login' ? (
          <>
            {t('noAccountQuestion')}{' '}
            <button type="button" className="text-primary hover:underline" onClick={() => onSwitchMode('register')}>
              {t('signUpNow')}
            </button>
          </>
        ) : (
          <>
            {t('haveAccountQuestion')}{' '}
            <button type="button" className="text-primary hover:underline" onClick={() => onSwitchMode('login')}>
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
  onSwitchMode,
}: LoginPanelAuthFieldsProps) => {
  const control = formControl as ComponentProps<typeof FormField>['control'];
  const { t } = useTranslation('auth');

  return (
    <FieldGroup>
      <OAuthButtons />
      <FieldSeparator>{t('orUseEmail')}</FieldSeparator>
      {mode === 'register' && <NameField control={control} isSubmitting={isSubmitting} />}
      <EmailField control={control} isSubmitting={isSubmitting} />
      <PasswordField mode={mode} control={control} isSubmitting={isSubmitting} />
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
