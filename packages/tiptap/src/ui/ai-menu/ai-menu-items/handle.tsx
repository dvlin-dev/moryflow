'use client';

import type { Editor } from '@tiptap/react';
import type { TextOptions } from '../../ai-types';

import { getContextAndInsertAt } from '../ai-menu-utils';
import { SUPPORTED_LANGUAGES, SUPPORTED_TONES } from './ai-menu-items-constants';
import type {
  EditorMenuAction,
  ExecutableMenuAction,
  MenuActionIdentifier,
  NestedMenuAction,
} from './ai-menu-items-types';
import { MicAiIcon } from '@moryflow/ui/icons/mic-ai-icon';
import { CheckAiIcon } from '@moryflow/ui/icons/check-ai-icon';
import { TextExtendIcon } from '@moryflow/ui/icons/text-extend-icon';
import { TextReduceIcon } from '@moryflow/ui/icons/text-reduce-icon';
import { Simplify2Icon } from '@moryflow/ui/icons/simplify-2-icon';
import { SmileAiIcon } from '@moryflow/ui/icons/smile-ai-icon';
import { CompleteSentenceIcon } from '@moryflow/ui/icons/complete-sentence-icon';
import { SummarizeTextIcon } from '@moryflow/ui/icons/summarize-text-icon';
import { LanguagesIcon } from '@moryflow/ui/icons/languages-icon';

import { LanguageSelectionSubmenu } from './components/language-selection-submenu';
import { ToneSelectionSubmenu } from './components/tone-selection-submenu';

type MenuActionsMap = Record<MenuActionIdentifier, EditorMenuAction>;

const createExecutableHandler =
  (command: (editor: Editor, options: TextOptions) => void) =>
  ({ editor, options }: { editor: Editor | null; onDone?: () => void; options?: TextOptions }) => {
    if (!editor) return;

    const { insertAt, isSelection, context } = getContextAndInsertAt(editor);
    const newOptions: TextOptions = {
      ...options,
      insertAt,
      regenerate: !isSelection,
    };

    if (isSelection) {
      newOptions.text = context;
    }

    command(editor, newOptions);
  };

export function initializeEditorMenuActions(): MenuActionsMap {
  return {
    adjustTone: {
      type: 'nested',
      component: ToneSelectionSubmenu,
      filterItems: true,
      icon: <MicAiIcon className="tiptap-button-icon" />,
      items: SUPPORTED_TONES,
      label: 'Adjust tone',
      value: 'adjustTone',
    },
    aiFixSpellingAndGrammar: {
      type: 'executable',
      icon: <CheckAiIcon className="tiptap-button-icon" />,
      label: 'Fix spelling & grammar',
      value: 'aiFixSpellingAndGrammar',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiFixSpellingAndGrammar(options).run()
      ),
    },
    aiExtend: {
      type: 'executable',
      icon: <TextExtendIcon className="tiptap-button-icon" />,
      label: 'Make longer',
      value: 'aiExtend',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiExtend(options).run()
      ),
    },
    aiShorten: {
      type: 'executable',
      icon: <TextReduceIcon className="tiptap-button-icon" />,
      label: 'Make shorter',
      value: 'aiShorten',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiShorten(options).run()
      ),
    },
    simplifyLanguage: {
      type: 'executable',
      icon: <Simplify2Icon className="tiptap-button-icon" />,
      label: 'Simplify language',
      value: 'simplifyLanguage',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiSimplify(options).run()
      ),
    },
    improveWriting: {
      type: 'executable',
      icon: <SmileAiIcon className="tiptap-button-icon" />,
      label: 'Improve writing',
      value: 'improveWriting',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiRephrase(options).run()
      ),
    },
    emojify: {
      type: 'executable',
      icon: <SmileAiIcon className="tiptap-button-icon" />,
      label: 'Emojify',
      value: 'emojify',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiEmojify(options).run()
      ),
    },
    continueWriting: {
      type: 'executable',
      icon: <CompleteSentenceIcon className="tiptap-button-icon" />,
      label: 'Continue writing',
      value: 'continueWriting',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiComplete(options).run()
      ),
    },
    summarize: {
      type: 'executable',
      icon: <SummarizeTextIcon className="tiptap-button-icon" />,
      label: 'Add a summary',
      value: 'summarize',
      onSelect: createExecutableHandler((editor, options) =>
        editor.chain().aiSummarize(options).run()
      ),
    },
    translateTo: {
      type: 'nested',
      component: LanguageSelectionSubmenu,
      filterItems: true,
      icon: <LanguagesIcon className="tiptap-button-icon" />,
      items: SUPPORTED_LANGUAGES,
      label: 'Languages',
      value: 'translateTo',
    },
  };
}

export function mapInteractionContextToActions(menuActions: MenuActionsMap) {
  const convertToMenuAction = (item: EditorMenuAction) => ({
    label: item.label,
    value: item.value,
    icon: item.icon,
    filterItems: item.type === 'nested' ? item.filterItems : undefined,
  });

  return [
    {
      label: 'Edit',
      items: Object.values([
        menuActions.adjustTone,
        menuActions.aiFixSpellingAndGrammar,
        menuActions.aiExtend,
        menuActions.aiShorten,
        menuActions.simplifyLanguage,
        menuActions.improveWriting,
        menuActions.emojify,
      ]).map(convertToMenuAction),
    },
    {
      label: 'Write',
      items: Object.values([
        menuActions.continueWriting,
        menuActions.summarize,
        menuActions.translateTo,
      ]).map(convertToMenuAction),
    },
  ];
}

export function isExecutableMenuItem(item: EditorMenuAction): item is ExecutableMenuAction {
  return item.type === 'executable';
}

export function isNestedMenuItem(item: EditorMenuAction): item is NestedMenuAction {
  return item.type === 'nested';
}
