import { useCallback, useEffect, useRef, useState } from 'react';
import { flip, offset, shift, size } from '@floating-ui/react';
import { PluginKey } from '@tiptap/pm/state';

// --- Hooks ---
import { useFloatingElement } from '../../hooks/use-floating-element';
import { useMenuNavigation } from '../../hooks/use-menu-navigation';
import { useTiptapEditor } from '../../hooks/use-tiptap-editor';

// --- Tiptap Editor ---
import type { Range } from '@tiptap/react';

// --- Tiptap UI ---
import { Suggestion } from '@tiptap/suggestion';

// --- UI Primitives ---
import {
  SuggestionPluginKey,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion';

import { calculateStartPosition } from './suggestion-menu-utils';
import type { SuggestionItem, SuggestionMenuProps } from './suggestion-menu-types';

/**
 * A component that renders a suggestion menu for Tiptap editors.
 * Displays a floating menu when a trigger character is typed.
 */
export const SuggestionMenu = ({
  editor: providedEditor,
  floatingOptions,
  selector = 'tiptap-suggestion-menu',
  children,
  maxHeight = 384,
  pluginKey = SuggestionPluginKey,
  ...internalSuggestionProps
}: SuggestionMenuProps) => {
  const { editor } = useTiptapEditor(providedEditor);

  const [show, setShow] = useState<boolean>(false);
  const showRef = useRef(false);
  useEffect(() => {
    showRef.current = show;
  }, [show]);

  // If later we want the floating stick to the position while browser is scrolling,
  // we can uncomment this part and pass the getBoundingClientRect prop to FloatingElement instead of referenceElement.
  // const [internalClientRect, setInternalClientRect] = useState<DOMRect | null>(
  //   null
  // )
  const [internalDecorationNode, setInternalDecorationNode] = useState<HTMLElement | null>(null);
  const [internalCommand, setInternalCommand] = useState<((item: SuggestionItem) => void) | null>(
    null
  );
  const [internalItems, setInternalItems] = useState<SuggestionItem[]>([]);
  const [internalQuery, setInternalQuery] = useState<string>('');
  const [, setInternalRange] = useState<Range | null>(null);

  const { ref, style, getFloatingProps, isMounted } = useFloatingElement(
    show,
    internalDecorationNode,
    1000,
    {
      placement: 'bottom-start',
      middleware: [
        offset(10),
        flip({
          mainAxis: true,
          crossAxis: false,
        }),
        shift(),
        size({
          apply({ availableHeight, elements }) {
            if (elements.floating) {
              const maxHeightValue = maxHeight
                ? Math.min(maxHeight, availableHeight)
                : availableHeight;

              elements.floating.style.setProperty(
                '--suggestion-menu-max-height',
                `${maxHeightValue}px`
              );
            }
          },
        }),
      ],
      onOpenChange(open) {
        if (!open) {
          setShow(false);
        }
      },
      ...floatingOptions,
    }
  );

  const internalSuggestionPropsRef = useRef(internalSuggestionProps);

  useEffect(() => {
    internalSuggestionPropsRef.current = internalSuggestionProps;
  }, [internalSuggestionProps]);

  const closePopup = useCallback(() => {
    // Update ref synchronously so onKeyDown's showRef guard is correct
    // in the same event cycle — don't rely on the async useEffect sync.
    showRef.current = false;
    setShow(false);
  }, []);

  // Track the last single character inserted by the user.
  // We only open the suggestion menu when the user *just typed* the trigger
  // character — not when the cursor happens to land after it (e.g. on page
  // load, setContent, arrow-key navigation, or after ESC dismissal).
  const lastTypedCharRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleTransaction = ({ transaction }: { transaction: any }) => {
      if (!transaction.docChanged) return;

      // Extract the text inserted by this transaction.
      let inserted = '';
      transaction.steps.forEach((step: any) => {
        try {
          if (step.slice?.content) {
            inserted += step.slice.content.textBetween(0, step.slice.content.size);
          }
        } catch {
          // ignore malformed steps
        }
      });

      // Only a single-character insertion counts as "user just typed a char".
      // Multi-char (paste, setContent) or deletions (backspace) reset to null.
      lastTypedCharRef.current = inserted.length === 1 ? inserted : null;
    };

    editor.on('beforeTransaction', handleTransaction);
    return () => {
      editor.off('beforeTransaction', handleTransaction);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    const existingPlugin = editor.state.plugins.find((plugin) => plugin.spec.key === pluginKey);
    if (existingPlugin) {
      editor.unregisterPlugin(pluginKey);
    }

    const suggestion = Suggestion({
      pluginKey: pluginKey instanceof PluginKey ? pluginKey : new PluginKey(pluginKey),
      editor,

      allow(props) {
        const $from = editor.state.doc.resolve(props.range.from);

        // Check if we're inside an image node
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === 'image') {
            return false; // Don't allow slash command inside image (since we support captions)
          }
        }

        return true;
      },

      command({ editor, range, props }) {
        if (!range) {
          return;
        }

        const { view, state } = editor;
        const { selection } = state;

        const isMention = editor.extensionManager.extensions.some((extension) => {
          const name = extension.name;
          return (
            name === 'mention' &&
            extension.options?.suggestion?.char === internalSuggestionPropsRef.current.char
          );
        });

        if (!isMention) {
          const cursorPosition = selection.$from.pos;
          const previousNode = selection.$head?.nodeBefore;

          const startPosition = previousNode
            ? calculateStartPosition(
                cursorPosition,
                previousNode,
                internalSuggestionPropsRef.current.char
              )
            : selection.$from.start();

          const transaction = state.tr.deleteRange(startPosition, cursorPosition);
          view.dispatch(transaction);
        }

        const nodeAfter = view.state.selection.$to.nodeAfter;
        const overrideSpace = nodeAfter?.text?.startsWith(' ');

        const rangeToUse = { ...range };

        if (overrideSpace) {
          rangeToUse.to += 1;
        }

        props.onSelect({ editor, range: rangeToUse, context: props.context });
      },

      render: () => {
        return {
          onStart: (props: SuggestionProps<SuggestionItem>) => {
            // Only open when the user just typed the trigger character.
            // Suppresses auto-open on page load, setContent, cursor movement,
            // and re-entry after ESC dismissal.
            if (lastTypedCharRef.current !== internalSuggestionPropsRef.current.char) {
              return;
            }
            setInternalDecorationNode((props.decorationNode as HTMLElement) ?? null);
            setInternalCommand(() => props.command);
            setInternalItems(props.items);
            setInternalQuery(props.query);
            setInternalRange(props.range);
            // setInternalClientRect(props.clientRect?.() ?? null)
            setShow(true);
          },

          onUpdate: (props: SuggestionProps<SuggestionItem>) => {
            setInternalDecorationNode((props.decorationNode as HTMLElement) ?? null);
            setInternalCommand(() => props.command);
            setInternalItems(props.items);
            setInternalQuery(props.query);
            setInternalRange(props.range);
            // setInternalClientRect(props.clientRect?.() ?? null)
          },

          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === 'Escape') {
              if (showRef.current) {
                closePopup();
                return true;
              }
              return false;
            }
            return false;
          },

          onExit: () => {
            lastTypedCharRef.current = null;
            setInternalDecorationNode(null);
            setInternalCommand(null);
            setInternalItems([]);
            setInternalQuery('');
            setInternalRange(null);
            // setInternalClientRect(null)
            setShow(false);
          },
        };
      },
      ...internalSuggestionPropsRef.current,
    });

    editor.registerPlugin(suggestion);

    return () => {
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(pluginKey);
      }
    };
  }, [editor, pluginKey, closePopup]);

  const onSelect = useCallback(
    (item: SuggestionItem) => {
      closePopup();

      if (internalCommand) {
        internalCommand(item);
      }
    },
    [closePopup, internalCommand]
  );

  const { selectedIndex } = useMenuNavigation({
    editor: editor,
    query: internalQuery,
    items: internalItems,
    onSelect,
  });

  if (!isMounted || !show || !editor) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={style}
      {...getFloatingProps()}
      data-selector={selector}
      className="tiptap-suggestion-menu"
      role="listbox"
      aria-label="Suggestions"
      onPointerDown={(e) => e.preventDefault()}
    >
      {children({
        items: internalItems,
        selectedIndex,
        onSelect,
      })}
    </div>
  );
};
