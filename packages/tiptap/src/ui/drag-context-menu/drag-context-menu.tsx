import { useCallback, useEffect, useMemo, useState } from "react"
import type { Node as TiptapNode } from "@tiptap/pm/model"
import { offset } from "@floating-ui/react"
import { DragHandle } from "@tiptap/extension-drag-handle-react"

// Hooks
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { useIsBreakpoint } from "../../hooks/use-is-breakpoint"
import { useUiEditorState } from "../../hooks/use-ui-editor-state"
import { selectNodeAndHideFloating } from "../../hooks/use-floating-toolbar-visibility"

// Primitive UI Components
import { Button, ButtonGroup } from "../../ui-primitive/button"
import { Spacer } from "../../ui-primitive/spacer"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuGroup,
  MenuGroupLabel,
  MenuButton,
} from "../../ui-primitive/menu"
import { Combobox, ComboboxList } from "../../ui-primitive/combobox"
import { Separator } from "../../ui-primitive/separator"

// Tiptap UI
import { useImageDownload } from "../image-download-button"
import {
  DuplicateShortcutBadge,
  useDuplicate,
} from "../duplicate-button"
import {
  CopyToClipboardShortcutBadge,
  useCopyToClipboard,
} from "../copy-to-clipboard-button"
import {
  DeleteNodeShortcutBadge,
  useDeleteNode,
} from "../delete-node-button"
import {
  CopyAnchorLinkShortcutBadge,
  useCopyAnchorLink,
} from "../copy-anchor-link-button"
import { useResetAllFormatting } from "../reset-all-formatting-button"
import { SlashCommandTriggerButton } from "../slash-command-trigger-button"
import {
  AskAiShortcutBadge,
  useAiAsk,
} from "../ai-ask-button"
import { useText } from "../text-button"
import { useHeading } from "../heading-button"
import { useList } from "../list-button"
import { useBlockquote } from "../blockquote-button"
import { useCodeBlock } from "../code-block-button"
import { ColorMenu } from "../color-menu"
import { TableAlignMenu } from "../../nodes/table-node/ui/table-alignment-menu"
import { useTableFitToWidth } from "../../nodes/table-node/ui/table-fit-to-width-button"
import { useTableClearRowColumnContent } from "../../nodes/table-node/ui/table-clear-row-column-content-button"

// Utils
import {
  getNodeDisplayName,
  isTextSelectionValid,
} from "../../utils/tiptap-collab-utils"
import { SR_ONLY } from "../../utils/tiptap-utils"

import type {
  DragContextMenuProps,
  MenuItemProps,
  NodeChangeData,
} from "./drag-context-menu-types"

// Icons
import { GripVerticalIcon } from "@aiget/ui/icons/grip-vertical-icon"
import { ChevronRightIcon } from "@aiget/ui/icons/chevron-right-icon"
import { Repeat2Icon } from "@aiget/ui/icons/repeat-2-icon"
import "./drag-context-menu.scss"

const useNodeTransformActions = () => {
  const text = useText()
  const heading1 = useHeading({ level: 1 })
  const heading2 = useHeading({ level: 2 })
  const heading3 = useHeading({ level: 3 })
  const bulletList = useList({ type: "bulletList" })
  const orderedList = useList({ type: "orderedList" })
  const taskList = useList({ type: "taskList" })
  const blockquote = useBlockquote()
  const codeBlock = useCodeBlock()

  const mapper = (
    action: ReturnType<
      | typeof useText
      | typeof useHeading
      | typeof useList
      | typeof useBlockquote
      | typeof useCodeBlock
    >
  ) => ({
    icon: action.Icon,
    label: action.label,
    onClick: action.handleToggle,
    disabled: !action.canToggle,
    isActive: action.isActive,
  })

  const actions = [
    mapper(text),
    ...[heading1, heading2, heading3].map(mapper),
    mapper(bulletList),
    mapper(orderedList),
    mapper(taskList),
    mapper(blockquote),
    mapper(codeBlock),
  ]

  const allDisabled = actions.every((a) => a.disabled)

  return allDisabled ? null : actions
}

const BaseMenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  isActive = false,
  shortcutBadge,
}) => (
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

const SubMenuTrigger: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}> = ({ icon: Icon, label, children }) => (
  <Menu
    placement="right"
    trigger={
      <MenuItem
        render={
          <MenuButton
            render={
              <Button data-style="ghost">
                <Icon className="tiptap-button-icon" />
                <span className="tiptap-button-text">{label}</span>
                <Spacer />
                <ChevronRightIcon className="tiptap-button-icon" />
              </Button>
            }
          />
        }
      />
    }
  >
    <MenuContent portal>
      <ComboboxList>{children}</ComboboxList>
    </MenuContent>
  </Menu>
)

const TransformActionGroup: React.FC = () => {
  const actions = useNodeTransformActions()
  const { canReset, handleResetFormatting, label, Icon } =
    useResetAllFormatting({
      hideWhenUnavailable: true,
      preserveMarks: ["inlineThread"],
    })

  if (!actions && !canReset) return null

  return (
    <>
      {actions && (
        <SubMenuTrigger icon={Repeat2Icon} label="Turn Into">
          <MenuGroup>
            <MenuGroupLabel>Turn into</MenuGroupLabel>
            {actions.map((action) => (
              <BaseMenuItem key={action.label} {...action} />
            ))}
          </MenuGroup>
        </SubMenuTrigger>
      )}

      {canReset && (
        <BaseMenuItem
          icon={Icon}
          label={label}
          disabled={!canReset}
          onClick={handleResetFormatting}
        />
      )}

      <Separator orientation="horizontal" />
    </>
  )
}

const TableFitToWidth: React.FC = () => {
  const { canFitToWidth, handleFitToWidth, label, Icon } = useTableFitToWidth({
    hideWhenUnavailable: true,
  })
  const clearAllContents = useTableClearRowColumnContent({ resetAttrs: true })

  return (
    <>
      {canFitToWidth && (
        <BaseMenuItem
          icon={Icon}
          label={label}
          disabled={!canFitToWidth}
          onClick={handleFitToWidth}
        />
      )}

      {clearAllContents.canClearRowColumnContent && (
        <BaseMenuItem
          icon={clearAllContents.Icon}
          label={"Clear all contents"}
          disabled={!clearAllContents.canClearRowColumnContent}
          onClick={clearAllContents.handleClear}
        />
      )}
    </>
  )
}

const ImageActionGroup: React.FC = () => {
  const { canDownload, handleDownload, label, Icon } = useImageDownload({
    hideWhenUnavailable: true,
  })

  if (!canDownload) return null

  return (
    <>
      <BaseMenuItem
        icon={Icon}
        label={label}
        disabled={!canDownload}
        onClick={handleDownload}
      />

      <Separator orientation="horizontal" />
    </>
  )
}

const CoreActionGroup: React.FC = () => {
  const {
    handleDuplicate,
    canDuplicate,
    label,
    Icon: DuplicateIcon,
  } = useDuplicate()
  const {
    handleCopyToClipboard,
    canCopyToClipboard,
    label: copyLabel,
    Icon: CopyIcon,
  } = useCopyToClipboard()
  const {
    handleCopyAnchorLink,
    canCopyAnchorLink,
    label: copyAnchorLinkLabel,
    Icon: CopyAnchorLinkIcon,
  } = useCopyAnchorLink()

  return (
    <>
      <MenuGroup>
        <BaseMenuItem
          icon={DuplicateIcon}
          label={label}
          onClick={handleDuplicate}
          disabled={!canDuplicate}
          shortcutBadge={<DuplicateShortcutBadge />}
        />
        <BaseMenuItem
          icon={CopyIcon}
          label={copyLabel}
          onClick={handleCopyToClipboard}
          disabled={!canCopyToClipboard}
          shortcutBadge={<CopyToClipboardShortcutBadge />}
        />
        <BaseMenuItem
          icon={CopyAnchorLinkIcon}
          label={copyAnchorLinkLabel}
          onClick={handleCopyAnchorLink}
          disabled={!canCopyAnchorLink}
          shortcutBadge={<CopyAnchorLinkShortcutBadge />}
        />
      </MenuGroup>

      <Separator orientation="horizontal" />
    </>
  )
}

const AIActionGroup: React.FC = () => {
  const { handleAiAsk, canAiAsk, Icon: AiAskIcon } = useAiAsk()

  if (!canAiAsk) return null

  return (
    <>
      <MenuGroup>
        {canAiAsk && (
          <BaseMenuItem
            icon={AiAskIcon}
            label="Ask AI"
            onClick={handleAiAsk}
            shortcutBadge={<AskAiShortcutBadge />}
          />
        )}
      </MenuGroup>

      <Separator orientation="horizontal" />
    </>
  )
}

const DeleteActionGroup: React.FC = () => {
  const { handleDeleteNode, canDeleteNode, label, Icon } = useDeleteNode()

  return (
    <MenuGroup>
      <BaseMenuItem
        icon={Icon}
        label={label}
        onClick={handleDeleteNode}
        disabled={!canDeleteNode}
        shortcutBadge={<DeleteNodeShortcutBadge />}
      />
    </MenuGroup>
  )
}

export const DragContextMenu: React.FC<DragContextMenuProps> = ({
  editor: providedEditor,
  withSlashCommandTrigger = true,
  mobileBreakpoint = 768,
  ...props
}) => {
  const { editor } = useTiptapEditor(providedEditor)
  const { aiGenerationActive, isDragging } = useUiEditorState(editor)
  const isMobile = useIsBreakpoint("max", mobileBreakpoint)
  const [open, setOpen] = useState(false)
  const [node, setNode] = useState<TiptapNode | null>(null)
  const [nodePos, setNodePos] = useState<number>(-1)

  const handleNodeChange = useCallback((data: NodeChangeData) => {
    if (data.node) setNode(data.node)
    setNodePos(data.pos)
  }, [])

  useEffect(() => {
    if (!editor) return
    editor.commands.setLockDragHandle(open)
    editor.commands.setMeta("lockDragHandle", open)
  }, [editor, open])

  const dynamicPositions = useMemo(() => {
    return {
      middleware: [
        offset((props) => {
          const { rects } = props
          const nodeHeight = rects.reference.height
          const dragHandleHeight = rects.floating.height

          const crossAxis = nodeHeight / 2 - dragHandleHeight / 2

          return {
            mainAxis: 16,
            // if height is more than 40px, then it's likely a block node
            crossAxis: nodeHeight > 40 ? 0 : crossAxis,
          }
        }),
      ],
    }
  }, [])

  const handleOnMenuClose = useCallback(() => {
    if (editor) {
      editor.commands.setMeta("hideDragHandle", true)
    }
  }, [editor])

  const onElementDragStart = useCallback(() => {
    if (!editor) return
    editor.commands.setIsDragging(true)
  }, [editor])

  const onElementDragEnd = useCallback(() => {
    if (!editor) return
    editor.commands.setIsDragging(false)

    setTimeout(() => {
      editor.view.dom.blur()
      editor.view.focus()
    }, 0)
  }, [editor])

  if (!editor) return null

  const nodeName = getNodeDisplayName(editor)

  return (
    <DragHandle
      editor={editor}
      onNodeChange={handleNodeChange}
      computePositionConfig={dynamicPositions}
      onElementDragStart={onElementDragStart}
      onElementDragEnd={onElementDragEnd}
      {...props}
    >
      <ButtonGroup
        orientation="horizontal"
        style={{
          ...(aiGenerationActive || isMobile || isTextSelectionValid(editor)
            ? { opacity: 0, pointerEvents: "none" }
            : {}),
          ...(isDragging ? { opacity: 0 } : {}),
        }}
      >
        {withSlashCommandTrigger && (
          <SlashCommandTriggerButton
            node={node}
            nodePos={nodePos}
            data-weight="small"
          />
        )}

        <Menu
          open={open}
          onOpenChange={setOpen}
          placement="left"
          trigger={
            <MenuButton
              render={
                <Button
                  data-style="ghost"
                  tabIndex={-1}
                  tooltip={
                    <>
                      <div>Click for options</div>
                      <div>Hold for drag</div>
                    </>
                  }
                  data-weight="small"
                  style={{
                    cursor: "grab",
                    ...(open ? { pointerEvents: "none" } : {}),
                  }}
                  onMouseDown={() => selectNodeAndHideFloating(editor, nodePos)}
                >
                  <GripVerticalIcon className="tiptap-button-icon" />
                </Button>
              }
            />
          }
        >
          <MenuContent
            onClose={handleOnMenuClose}
            autoFocusOnHide={false}
            preventBodyScroll={true}
            portal
          >
            <Combobox style={SR_ONLY} />
            <ComboboxList style={{ minWidth: "15rem" }}>
              <MenuGroup>
                <MenuGroupLabel>{nodeName}</MenuGroupLabel>
                <ColorMenu />
                <TableAlignMenu />
                <TableFitToWidth />
                <TransformActionGroup />
                <ImageActionGroup />
              </MenuGroup>

              <CoreActionGroup />

              <AIActionGroup />

              <DeleteActionGroup />
            </ComboboxList>
          </MenuContent>
        </Menu>
      </ButtonGroup>
    </DragHandle>
  )
}
