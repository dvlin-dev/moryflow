import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

// --- Lib ---
import { isNodeTypeSelected } from "../../utils/tiptap-utils"

// --- Tiptap UI ---
import { DeleteNodeButton } from "../../ui/delete-node-button"
import { ImageDownloadButton } from "../../ui/image-download-button"
import { ImageAlignButton } from "../../ui/image-align-button"

// --- UI Primitive ---
import { Separator } from "../../ui-primitive/separator"
import { ImageCaptionButton } from "../../ui/image-caption-button"
import { ImageUploadButton } from "../../ui/image-upload-button"
import { RefreshCcwIcon } from "@anyhunt/ui/icons/refresh-ccw-icon"

export function ImageNodeFloating({
  editor: providedEditor,
}: {
  editor?: Editor | null
}) {
  const { editor } = useTiptapEditor(providedEditor)
  const visible = isNodeTypeSelected(editor, ["image"])

  if (!editor || !visible) {
    return null
  }

  return (
    <>
      <ImageAlignButton align="left" />
      <ImageAlignButton align="center" />
      <ImageAlignButton align="right" />
      <Separator />
      <ImageCaptionButton />
      <Separator />
      <ImageDownloadButton />
      <ImageUploadButton icon={RefreshCcwIcon} tooltip="Replace" />
      <Separator />
      <DeleteNodeButton />
    </>
  )
}
