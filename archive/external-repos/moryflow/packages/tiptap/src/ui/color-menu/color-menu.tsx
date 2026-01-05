import type { Editor } from "@tiptap/react"

// Primitive UI Components
import { Button } from "../../ui-primitive/button"
import { Spacer } from "../../ui-primitive/spacer"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuGroup,
  MenuGroupLabel,
  MenuButton,
} from "../../ui-primitive/menu"
import { ComboboxList } from "../../ui-primitive/combobox"
import { Separator } from "../../ui-primitive/separator"

// Tiptap UI
import {
  TEXT_COLORS,
  useColorText,
} from "../color-text-button"
import {
  HIGHLIGHT_COLORS,
  useColorHighlight,
} from "../color-highlight-button"
import type { RecentColor } from "../color-text-popover"
import {
  getColorByValue,
  useRecentColors,
} from "../color-text-popover"

// Icons
import { PaintBucketIcon } from "@moryflow/ui/icons/paint-bucket-icon"
import { ChevronRightIcon } from "@moryflow/ui/icons/chevron-right-icon"
import { TextColorSmallIcon } from "@moryflow/ui/icons/text-color-small-icon"
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"

interface ColorMenuItemProps {
  color: { value: string; label: string }
}

const TextColorMenuItem: React.FC<ColorMenuItemProps> = ({ color }) => {
  const { addRecentColor } = useRecentColors()
  const { isActive, handleColorText, label } = useColorText({
    label: color.label,
    textColor: color.value,
    onApplied: ({ color, label }) =>
      addRecentColor({ type: "text", label, value: color }),
  })

  return (
    <MenuItem
      render={
        <Button
          data-style="ghost"
          data-active-state={isActive ? "on" : "off"}
        />
      }
      onClick={handleColorText}
    >
      <span className="tiptap-button-color-text" style={{ color: color.value }}>
        <TextColorSmallIcon
          className="tiptap-button-icon"
          style={{ color: color.value, flexGrow: 1 }}
        />
      </span>
      <span className="tiptap-button-text">{label}</span>
    </MenuItem>
  )
}

const HighlightColorMenuItem: React.FC<ColorMenuItemProps> = ({ color }) => {
  const { addRecentColor } = useRecentColors()
  const { isActive, handleColorHighlight, label } = useColorHighlight({
    label: color.label,
    highlightColor: color.value,
    mode: "node",
    onApplied: ({ color, label }) =>
      addRecentColor({ type: "highlight", label, value: color }),
  })

  return (
    <MenuItem
      render={
        <Button
          data-style="ghost"
          data-active-state={isActive ? "on" : "off"}
        />
      }
      onClick={handleColorHighlight}
    >
      <span
        className="tiptap-button-highlight"
        style={{ "--highlight-color": color.value } as React.CSSProperties}
      />
      <span className="tiptap-button-text">{label}</span>
    </MenuItem>
  )
}

const RecentColorMenuItem: React.FC<{
  colorObj: RecentColor
}> = ({ colorObj }) => {
  const colorSet = colorObj.type === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS
  const color = getColorByValue(colorObj.value, colorSet)

  const ColorComponent =
    colorObj.type === "text" ? TextColorMenuItem : HighlightColorMenuItem

  return <ColorComponent color={color} />
}

export interface ColorMenuProps {
  editor?: Editor | null
  /**
   * Custom trigger component. If not provided, uses default paint bucket button.
   */
  trigger?: React.ReactNode
  /**
   * Label for the color menu trigger
   * @default "Color"
   */
  label?: string
  /**
   * Menu placement relative to trigger
   * @default "right"
   */
  placement?: React.ComponentProps<typeof Menu>["placement"]
}

/**
 * Reusable color menu component that provides text and highlight color options.
 * Includes recent colors, text colors, and highlight colors sections.
 */
export const ColorMenu: React.FC<ColorMenuProps> = ({
  editor: providedEditor,
  trigger,
  label = "Color",
  placement = "right",
}) => {
  const { editor } = useTiptapEditor(providedEditor)
  const { recentColors, isInitialized } = useRecentColors()

  const hasColorActions: boolean =
    !!editor?.can().setMark("textStyle") ||
    !!editor?.can().setMark("highlight") ||
    !!editor?.can().toggleNodeBackgroundColor("yellow") ||
    false

  if (!editor || !hasColorActions) {
    return null
  }

  const defaultTrigger = (
    <MenuItem
      render={
        <MenuButton
          render={
            <Button data-style="ghost">
              <PaintBucketIcon className="tiptap-button-icon" />
              <span className="tiptap-button-text">{label}</span>
              <Spacer />
              <ChevronRightIcon className="tiptap-button-icon" />
            </Button>
          }
        />
      }
    />
  )

  return (
    <Menu placement={placement} trigger={trigger || defaultTrigger}>
      <MenuContent portal>
        <ComboboxList>
          {/* Recent Colors */}
          {isInitialized && recentColors.length > 0 && (
            <MenuGroup>
              <MenuGroupLabel>Recent colors</MenuGroupLabel>
              {recentColors.map((colorObj) => (
                <RecentColorMenuItem key={colorObj.value} colorObj={colorObj} />
              ))}
              <Separator orientation="horizontal" />
            </MenuGroup>
          )}

          {/* Text Colors */}
          <MenuGroup>
            <MenuGroupLabel>Text color</MenuGroupLabel>
            {TEXT_COLORS.map((textColor) => (
              <TextColorMenuItem key={textColor.value} color={textColor} />
            ))}
          </MenuGroup>

          <Separator orientation="horizontal" />

          {/* Background Colors */}
          <MenuGroup>
            <MenuGroupLabel>Background color</MenuGroupLabel>
            {HIGHLIGHT_COLORS.map((highlightColor) => (
              <HighlightColorMenuItem
                key={highlightColor.value}
                color={highlightColor}
              />
            ))}
          </MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  )
}

export { TextColorMenuItem, HighlightColorMenuItem, RecentColorMenuItem }
