'use client';

import { Button } from '../../../ui-primitive/button';
import { ToolbarGroup, ToolbarSeparator } from '../../../ui-primitive/toolbar';
import { ArrowLeftIcon } from '@moryflow/ui/icons/arrow-left-icon';

import type { SpecializedToolbarContentProps } from '../types';

/**
 * 专门视图内容（如高亮、链接编辑等）
 */
export function SpecializedToolbarContent({ view, onBack }: SpecializedToolbarContentProps) {
  return (
    <>
      <ToolbarGroup>
        <Button data-style="ghost" onClick={onBack}>
          <ArrowLeftIcon className="tiptap-button-icon" />
          {view.renderIcon()}
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      {view.renderContent()}
    </>
  );
}
