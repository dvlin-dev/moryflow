/**
 * [PROPS]: SessionContextFieldsProps
 * [EMITS]: none
 * [POS]: Session 上下文字段聚合层
 */

import type { UseFormReturn } from 'react-hook-form';
import type { BrowserSessionValues } from '../../schemas';
import { SessionContextDataFields } from './session-context-data-fields';
import { SessionContextLayoutFields } from './session-context-layout-fields';
import { SessionContextToggleFields } from './session-context-toggle-fields';

type SessionContextFieldsProps = {
  form: UseFormReturn<BrowserSessionValues>;
};

export function SessionContextFields({ form }: SessionContextFieldsProps) {
  return (
    <>
      <SessionContextLayoutFields form={form} />
      <SessionContextDataFields form={form} />
      <SessionContextToggleFields form={form} />
    </>
  );
}
