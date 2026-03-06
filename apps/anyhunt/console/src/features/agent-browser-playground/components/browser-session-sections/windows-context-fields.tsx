/**
 * [PROPS]: WindowsContextFieldsProps
 * [EMITS]: none
 * [POS]: Windows 上下文字段聚合层
 */

import type { UseFormReturn } from 'react-hook-form';
import type { BrowserWindowsValues } from '../../schemas';
import { WindowsContextDataFields } from './windows-context-data-fields';
import { WindowsContextLayoutFields } from './windows-context-layout-fields';
import { WindowsContextToggleFields } from './windows-context-toggle-fields';

type WindowsContextFieldsProps = {
  form: UseFormReturn<BrowserWindowsValues>;
};

export function WindowsContextFields({ form }: WindowsContextFieldsProps) {
  return (
    <>
      <WindowsContextLayoutFields form={form} />
      <WindowsContextDataFields form={form} />
      <WindowsContextToggleFields form={form} />
    </>
  );
}
