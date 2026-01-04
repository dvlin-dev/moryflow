"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"
import { NodeSelection } from "@tiptap/pm/state"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- Lib ---
import {
  isExtensionAvailable,
  isNodeTypeSelected,
} from "../../utils/tiptap-utils"

// --- Icons ---
import { ImageCaptionIcon } from "@aiget/ui/icons/image-caption-icon"

/**
 * Configuration for the image caption functionality
 */
export interface UseImageCaptionConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether the button should hide when caption toggle is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful caption set.
   */
  onSet?: () => void
}

/**
 * Checks if image caption can be toggled in the current editor state
 */
export function canToggleImageCaption(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, ["image"])) return false

  return isNodeTypeSelected(editor, ["image"])
}

/**
 * Checks if the currently selected image has caption enabled
 */
export function isImageCaptionActive(editor: Editor | null): boolean {
  if (!editor) return false

  try {
    const { selection } = editor.state
    const isImageSelected =
      selection instanceof NodeSelection && selection.node.type.name === "image"

    if (!isImageSelected) {
      return false
    }

    const imageNode = (selection as NodeSelection).node
    return imageNode.attrs.showCaption === true || imageNode.content.size > 0
  } catch {
    return false
  }
}

/**
 * Toggles the image caption in the editor
 */
export function setImageCaption(editor: Editor | null): boolean {
  if (!editor?.isEditable || !canToggleImageCaption(editor)) {
    return false
  }

  try {
    const { selection } = editor.state
    const isImageSelected =
      selection instanceof NodeSelection && selection.node.type.name === "image"

    if (!isImageSelected) {
      return false
    }

    const captionEnabled = editor
      .chain()
      .focus()
      .updateAttributes("image", { showCaption: true })
      .run()

    if (!captionEnabled) {
      return false
    }

    const imagePosition = selection.from
    editor
      .chain()
      .focus(imagePosition + 1)
      .selectTextblockEnd()
      .run()

    return true
  } catch {
    return false
  }
}

/**
 * Determines if the image caption button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const { editor, hideWhenUnavailable } = props

  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, ["image"])) return false

  if (hideWhenUnavailable) {
    return canToggleImageCaption(editor)
  }

  return true
}

/**
 * Custom hook that provides image caption functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MyImageCaptionButton() {
 *   const { isVisible, handleToggleCaption } = useImageCaption()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleToggleCaption}>Toggle Caption</button>
 * }
 *
 * // Advanced usage
 * function MyAdvancedImageCaptionButton() {
 *   const { isVisible, handleToggleCaption, label, canToggle } = useImageCaption({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onSet: () => console.log('Caption set!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleToggleCaption}
 *       disabled={!canToggle}
 *       aria-label={label}
 *     >
 *       Toggle Caption
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useImageCaption(config?: UseImageCaptionConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onSet,
  } = config || {}

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState<boolean>(true)
  const [isActive, setIsActive] = useState<boolean>(false)
  const canToggle = canToggleImageCaption(editor)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }))
      setIsActive(isImageCaptionActive(editor))
    }

    handleSelectionUpdate()

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  const handleToggleCaption = useCallback(() => {
    if (!editor) return false

    const success = setImageCaption(editor)
    if (success) {
      onSet?.()
    }
    return success
  }, [editor, onSet])

  return {
    isVisible,
    isActive,
    canToggle,
    handleToggleCaption,
    label: "Caption",
    Icon: ImageCaptionIcon,
  }
}
