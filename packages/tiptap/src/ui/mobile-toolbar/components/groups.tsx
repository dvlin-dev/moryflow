'use client';

import { ChevronRightIcon } from '@moryflow/ui/icons/chevron-right-icon';
import { PaintBucketIcon } from '@moryflow/ui/icons/paint-bucket-icon';
import { Repeat2Icon } from '@moryflow/ui/icons/repeat-2-icon';
import { Button, ButtonGroup } from '../../../ui-primitive/button';
import { Card, CardBody, CardGroupLabel, CardItemGroup } from '../../../ui-primitive/card';
import { Spacer } from '../../../ui-primitive/spacer';
import { Separator } from '../../../ui-primitive/separator';
import { ToolbarGroup, ToolbarSeparator } from '../../../ui-primitive/toolbar';
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../../ui-primitive/dropdown-menu';
import { ColorHighlightButton, HIGHLIGHT_COLORS } from '../../color-highlight-button';
import { ColorTextButton, TEXT_COLORS } from '../../color-text-button';
import { useRecentColors } from '../../color-text-popover';
import { MarkButton } from '../../mark-button';
import { TextAlignButton } from '../../text-align-button';
import { TurnIntoDropdownContent } from '../../turn-into-dropdown';

/**
 * 对齐按钮组
 */
export function AlignmentGroup() {
  return (
    <>
      <ToolbarGroup>
        <TextAlignButton align="left" hideWhenUnavailable />
        <TextAlignButton align="center" hideWhenUnavailable />
        <TextAlignButton align="right" hideWhenUnavailable />
        <TextAlignButton align="justify" hideWhenUnavailable />
      </ToolbarGroup>

      <ToolbarSeparator />
    </>
  );
}

/**
 * 上下标按钮组
 */
export function ScriptGroup() {
  return (
    <>
      <ToolbarGroup>
        <MarkButton type="superscript" hideWhenUnavailable />
        <MarkButton type="subscript" hideWhenUnavailable />
      </ToolbarGroup>

      <ToolbarSeparator />
    </>
  );
}

/**
 * 文本格式按钮组
 */
export function FormattingGroup() {
  return (
    <>
      <ToolbarGroup>
        <MarkButton type="bold" hideWhenUnavailable />
        <MarkButton type="italic" hideWhenUnavailable />
        <MarkButton type="strike" hideWhenUnavailable />
        <MarkButton type="code" hideWhenUnavailable />
      </ToolbarGroup>

      <ToolbarSeparator />
    </>
  );
}

/**
 * 颜色操作子菜单
 */
export function ColorActionGroup() {
  const { recentColors, isInitialized, addRecentColor } = useRecentColors();

  const renderRecentColors = () => {
    if (!isInitialized || recentColors.length === 0) return null;

    return (
      <>
        <CardItemGroup>
          <CardGroupLabel>Recent colors</CardGroupLabel>
          <ButtonGroup>
            {recentColors.map((colorObj) => (
              <DropdownMenuItem key={`${colorObj.type}-${colorObj.value}`} asChild>
                {colorObj.type === 'text' ? (
                  <ColorTextButton
                    textColor={colorObj.value}
                    label={colorObj.label}
                    text={colorObj.label}
                    tooltip={colorObj.label}
                    onApplied={({ color, label }) =>
                      addRecentColor({ type: 'text', label, value: color })
                    }
                  />
                ) : (
                  <ColorHighlightButton
                    highlightColor={colorObj.value}
                    text={colorObj.label}
                    tooltip={colorObj.label}
                    onApplied={({ color, label }) =>
                      addRecentColor({ type: 'highlight', label, value: color })
                    }
                  />
                )}
              </DropdownMenuItem>
            ))}
          </ButtonGroup>
        </CardItemGroup>
        <Separator orientation="horizontal" />
      </>
    );
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger asChild>
        <Button data-style="ghost">
          <PaintBucketIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">Color</span>
          <Spacer />
          <ChevronRightIcon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuSubTrigger>

      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <Card>
            <CardBody>
              {renderRecentColors()}

              <CardItemGroup>
                <CardGroupLabel>Text color</CardGroupLabel>
                <ButtonGroup>
                  {TEXT_COLORS.map((textColor) => (
                    <DropdownMenuItem key={textColor.value} asChild>
                      <ColorTextButton
                        textColor={textColor.value}
                        label={textColor.label}
                        text={textColor.label}
                        tooltip={textColor.label}
                        onApplied={({ color, label }) =>
                          addRecentColor({ type: 'text', label, value: color })
                        }
                      />
                    </DropdownMenuItem>
                  ))}
                </ButtonGroup>
              </CardItemGroup>

              <Separator orientation="horizontal" />

              <CardItemGroup>
                <CardGroupLabel>Highlight color</CardGroupLabel>
                <ButtonGroup>
                  {HIGHLIGHT_COLORS.map((highlightColor) => (
                    <DropdownMenuItem key={highlightColor.value} asChild>
                      <ColorHighlightButton
                        highlightColor={highlightColor.value}
                        text={highlightColor.label}
                        tooltip={highlightColor.label}
                        onApplied={({ color, label }) =>
                          addRecentColor({
                            type: 'highlight',
                            label,
                            value: color,
                          })
                        }
                      />
                    </DropdownMenuItem>
                  ))}
                </ButtonGroup>
              </CardItemGroup>
            </CardBody>
          </Card>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

/**
 * 块类型转换子菜单
 */
export function TransformActionGroup() {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger asChild>
        <Button data-style="ghost">
          <Repeat2Icon className="tiptap-button-icon" />
          <span className="tiptap-button-text">Turn into</span>
          <Spacer />
          <ChevronRightIcon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent>
        <TurnIntoDropdownContent />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
