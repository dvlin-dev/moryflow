"use client";

import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type { TextOptions } from "../../../ai-types";

import { getContextAndInsertAt } from "../../ai-menu-utils";
import { useAiMenuState } from "../../ai-menu-hooks";
import {
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuContent,
  MenuGroup,
  MenuItem,
  useComboboxValueState,
  filterMenuItems,
} from "../../../../ui-primitive/menu";
import { Button } from "../../../../ui-primitive/button";
import { ComboboxList } from "../../../../ui-primitive/combobox";
import { MicAiIcon } from "@moryflow/ui/icons/mic-ai-icon";
import { ChevronRightIcon } from "@moryflow/ui/icons/chevron-right-icon";

import { SUPPORTED_TONES } from "../ai-menu-items-constants";

export function ToneSelectionSubmenu({
  editor,
}: {
  editor: Editor | null;
}) {
  const [searchValue] = useComboboxValueState();
  const { state, updateState } = useAiMenuState();

  const availableTones = useMemo(() => {
    return filterMenuItems({ items: SUPPORTED_TONES }, searchValue);
  }, [searchValue]);

  const handleToneSelection = useCallback(
    (selectedTone: string) => {
      if (!editor) return;

      const { insertAt, isSelection, context } = getContextAndInsertAt(editor);

      if (!state.tone || state.tone !== selectedTone) {
        updateState({ tone: selectedTone });
      }

      const toneOptions: TextOptions = {
        stream: true,
        format: "rich-text",
        insertAt,
        regenerate: !isSelection,
      };

      if (state.language) {
        toneOptions.language = state.language;
      }

      if (isSelection) {
        toneOptions.text = context;
      }

      editor.chain().aiAdjustTone(selectedTone, toneOptions).run();
    },
    [editor, state.language, state.tone, updateState]
  );

  const toneMenuItems = availableTones.map((tone) => (
    <MenuItem
      key={tone.value}
      onClick={() => handleToneSelection(tone.value || "")}
      render={
        <Button data-style="ghost">
          <span className="tiptap-button-text">{tone.label}</span>
        </Button>
      }
    />
  ));

  if (searchValue) {
    return toneMenuItems;
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
                  <MicAiIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">Adjust Tone</span>
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
          <MenuGroup>{toneMenuItems}</MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  );
}
