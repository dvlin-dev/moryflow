import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Field, FieldGroup, FieldLabel } from '@moryflow/ui/components/field';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import { useTranslation } from '@/lib/i18n';
import { fetchProfile, updateProfile, useAuth } from '@/lib/server';

type ProfileEditorProps = {
  initialDisplayName?: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

type ProfileEditorFormValues = {
  displayName: string;
};

export const ProfileEditor = ({
  initialDisplayName = '',
  onSaved,
  onCancel,
}: ProfileEditorProps) => {
  const { t } = useTranslation('auth');
  const { refresh } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        displayName: z.string().trim().max(80, t('operationFailed')),
      }),
    [t]
  );

  const form = useForm<ProfileEditorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: initialDisplayName,
    },
  });
  const { clearErrors, reset, setError } = form;

  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      clearErrors('root');
      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          reset({
            displayName: profile.displayName || initialDisplayName,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setError('root', {
            message: error instanceof Error ? error.message : t('operationFailed'),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [clearErrors, initialDisplayName, reset, setError]);

  const handleSave = form.handleSubmit(async (values) => {
    setIsSaving(true);
    form.clearErrors('root');

    try {
      await updateProfile({
        displayName: values.displayName.trim(),
      });

      const established = await refresh();
      if (!established) {
        throw new Error(t('operationFailed'));
      }

      onSaved?.();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : t('operationFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{t('editProfile')}</h3>
        <p className="text-sm text-muted-foreground">{t('signInToCloudService')}</p>
      </div>

      <Form {...formProviderProps}>
        <FieldGroup>
          <FormField
            control={formControl}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FieldLabel htmlFor="display-name">{t('nickname')}</FieldLabel>
                <FormControl>
                  <Input
                    id="display-name"
                    disabled={isLoading || isSaving}
                    placeholder={t('nicknamePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <Field className="gap-3">
            <Button
              type="button"
              className="w-full"
              disabled={isLoading || isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? t('sending') : t('saveChanges')}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
                {t('backButton')}
              </Button>
            )}
          </Field>
        </FieldGroup>
      </Form>
    </div>
  );
};
