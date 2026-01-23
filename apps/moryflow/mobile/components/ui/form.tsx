/**
 * [PROVIDES]: Mobile 端表单组件（RHF 绑定与错误显示）
 * [DEPENDS]: react-hook-form, ui/label, ui/text
 * [POS]: 统一表单体验与校验输出
 */

import * as React from 'react';
import { View } from 'react-native';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Text } from './text';

const Form = FormProvider;

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues> = {
  name: FieldPath<TFieldValues>;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

const useFormField = () => {
  const context = React.useContext(FormFieldContext);
  const form = useFormContext();

  if (!context) {
    throw new Error('FormField must be used within FormFieldContext');
  }

  const fieldState = form.getFieldState(context.name, form.formState);

  return { name: context.name, error: fieldState.error };
};

type FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  name: TName;
  control: Control<TFieldValues>;
  render: (props: { field: ControllerRenderProps<TFieldValues, TName> }) => React.ReactElement;
};

const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  name,
  control,
  render,
}: FormFieldProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name }}>
    <Controller control={control} name={name} render={render} />
  </FormFieldContext.Provider>
);

const FormItem = React.forwardRef<View, React.ComponentProps<typeof View>>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('gap-1.5', className)} {...props} />
  )
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentProps<typeof Label>
>(({ className, ...props }, ref) => <Label ref={ref} className={cn(className)} {...props} />);
FormLabel.displayName = 'FormLabel';

const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const FormMessage = ({ className }: { className?: string }) => {
  const { error } = useFormField();
  const message = error?.message;
  if (!message) {
    return null;
  }
  return (
    <Text className={cn('text-destructive text-sm font-medium', className)}>{String(message)}</Text>
  );
};

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage };
