import { forwardRef, useCallback } from "react"

// --- Lib ---
import { parseShortcutKeys } from "../../utils/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseImageDownloadConfig } from "./use-image-download"
import {
  IMAGE_DOWNLOAD_SHORTCUT_KEY,
  useImageDownload,
} from "./use-image-download"

// --- UI Primitives ---
import type { ButtonProps } from "../../ui-primitive/button"
import { Button } from "../../ui-primitive/button"
import { Badge } from "../../ui-primitive/badge"

export interface ImageDownloadButtonProps
  extends Omit<ButtonProps, "type">,
    UseImageDownloadConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean
}

export function ImageDownloadShortcutBadge({
  shortcutKeys = IMAGE_DOWNLOAD_SHORTCUT_KEY,
}: {
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

/**
 * Button component for downloading images from a Tiptap editor.
 * Only appears when an image is selected in the editor.
 *
 * For custom button implementations, use the `useImageDownload` hook instead.
 */
export const ImageDownloadButton = forwardRef<
  HTMLButtonElement,
  ImageDownloadButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onDownloaded,
      resolveFileUrl,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canDownload,
      handleDownload,
      label,
      shortcutKeys,
      Icon,
    } = useImageDownload({
      editor,
      hideWhenUnavailable,
      onDownloaded,
      resolveFileUrl,
    })

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        await handleDownload()
      },
      [handleDownload, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        data-style="ghost"
        data-active-state="off"
        role="button"
        tabIndex={-1}
        disabled={!canDownload}
        data-disabled={!canDownload}
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
            {showShortcut && (
              <ImageDownloadShortcutBadge shortcutKeys={shortcutKeys} />
            )}
          </>
        )}
      </Button>
    )
  }
)

ImageDownloadButton.displayName = "ImageDownloadButton"
