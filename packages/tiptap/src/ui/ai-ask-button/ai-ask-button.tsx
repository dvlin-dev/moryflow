"use client"

import { forwardRef, useCallback } from "react"

// --- Lib ---
import { parseShortcutKeys } from "../../utils/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- TIptap UI ---
import type { UseAiAskConfig } from "./use-ai-ask"
import {
  AI_ASK_SHORTCUT_KEY,
  useAiAsk,
} from "./use-ai-ask"

// --- UI Primitives ---
import type { ButtonProps } from "../../ui-primitive/button"
import { Button } from "../../ui-primitive/button"
import { Badge } from "../../ui-primitive/badge"

export interface AiAskButtonProps
  extends Omit<ButtonProps, "type">,
    UseAiAskConfig {
  /**
   * Optional text to display alongside the icon
   */
  text?: string
  /**
   * Optional show shortcut keys in the button
   */
  showShortcut?: boolean
}

/**
 * Badge component displaying the AI shortcut key
 */
export function AskAiShortcutBadge({
  shortcutKeys = AI_ASK_SHORTCUT_KEY,
}: {
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

/**
 * Button component for triggering AI ask functionality on selected content in a Tiptap editor.
 */
export const AiAskButton = forwardRef<HTMLButtonElement, AiAskButtonProps>(
  function AiAskButton(
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onAiAsked,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, canAiAsk, handleAiAsk, label, shortcutKeys, Icon } =
      useAiAsk({
        editor,
        hideWhenUnavailable,
        onAiAsked,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleAiAsk()
      },
      [handleAiAsk, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        data-style="ghost"
        disabled={!canAiAsk}
        data-disabled={!canAiAsk}
        role="button"
        tabIndex={-1}
        aria-label={label}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
            {showShortcut && <AskAiShortcutBadge shortcutKeys={shortcutKeys} />}
          </>
        )}
      </Button>
    )
  }
)
