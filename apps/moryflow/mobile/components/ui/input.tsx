/**
 * [PROPS]: TextInputProps
 * [EMITS]: onChangeText/onSubmitEditing
 * [POS]: 通用输入框组件
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';

// Note: placeholderClassName was a nativewind-specific prop, no longer available in uniwind
type InputProps = TextInputProps;

const Input = React.forwardRef<TextInput, InputProps>(({ className, ...props }, ref) => (
  <TextInput
    ref={ref}
    className={cn(
      'dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5 sm:h-9',
      props.editable === false &&
        cn(
          'opacity-50',
          Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
        ),
      Platform.select({
        web: cn(
          'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground transition-[color,box-shadow] outline-none md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
        ),
        native: 'placeholder:text-muted-foreground/50',
      }),
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
