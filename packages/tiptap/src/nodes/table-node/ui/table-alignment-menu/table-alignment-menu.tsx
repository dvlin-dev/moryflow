import type { Orientation } from "../../lib/tiptap-table-utils"

// --- UI ---
import { useTableAlignCell } from "../table-align-cell-button"

// --- Icons ---
import { AlignmentIcon } from "@anyhunt/ui/icons/alignment-icon"
import { ChevronRightIcon } from "@anyhunt/ui/icons/chevron-right-icon"

// --- UI Primitives ---
import {
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuContent,
  MenuGroup,
  MenuItem,
} from "../../../../ui-primitive/menu"
import { Button } from "../../../../ui-primitive/button"
import { ComboboxList } from "../../../../ui-primitive/combobox"
import { Separator } from "../../../../ui-primitive/separator"

export interface ActionItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
  shortcutBadge?: React.ReactNode
}

export const TableAlignMenu = ({
  index,
  orientation,
}: {
  index?: number
  orientation?: Orientation
}) => {
  const textAlign = {
    left: useTableAlignCell({
      alignmentType: "text",
      alignment: "left",
      index,
      orientation,
    }),
    center: useTableAlignCell({
      alignmentType: "text",
      alignment: "center",
      index,
      orientation,
    }),
    right: useTableAlignCell({
      alignmentType: "text",
      alignment: "right",
      index,
      orientation,
    }),
  }

  const verticalAlign = {
    top: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "top",
      index,
      orientation,
    }),
    middle: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "middle",
      index,
      orientation,
    }),
    bottom: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "bottom",
      index,
      orientation,
    }),
  }

  if (!textAlign.left.canAlignCell()) {
    return null
  }

  return (
    <Menu
      placement="right"
      trigger={
        <MenuButton
          render={
            <MenuItem
              render={
                <Button data-style="ghost">
                  <AlignmentIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">Alignment</span>
                  <MenuButtonArrow render={<ChevronRightIcon />} />
                </Button>
              }
            />
          }
        />
      }
    >
      <MenuContent>
        <ComboboxList>
          <MenuGroup>
            {Object.values(textAlign).map((align, i) => (
              <ActionItem
                key={`text-${i}`}
                icon={align.Icon}
                label={align.label}
                disabled={!align.canAlignCell}
                isActive={align.isActive}
                onClick={align.handleAlign}
              />
            ))}
            <Separator orientation="horizontal" />
            {Object.values(verticalAlign).map((align, i) => (
              <ActionItem
                key={`vertical-${i}`}
                icon={align.Icon}
                label={align.label}
                disabled={!align.canAlignCell}
                isActive={align.isActive}
                onClick={align.handleAlign}
              />
            ))}
          </MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  )
}

const ActionItem = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  isActive = false,
  shortcutBadge,
}: ActionItemProps) => (
  <MenuItem
    render={
      <Button data-style="ghost" data-active-state={isActive ? "on" : "off"} />
    }
    onClick={onClick}
    disabled={disabled}
  >
    <Icon className="tiptap-button-icon" />
    <span className="tiptap-button-text">{label}</span>
    {shortcutBadge}
  </MenuItem>
)

ActionItem.displayName = "ActionItem"
