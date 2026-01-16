"use client";

import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type {
  Language,
  TextOptions,
} from "../../../ai-types";

import { getContextAndInsertAt } from "../../ai-menu-utils";
import { useAiMenuState } from "../../ai-menu-hooks";
import {
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
} from "../../../../ui-primitive/menu";
import {
  Button,
} from "../../../../ui-primitive/button";
import { ComboboxList } from "../../../../ui-primitive/combobox";
import { useComboboxValueState } from "../../../../ui-primitive/menu";
import {
  filterMenuItems,
} from "../../../../ui-primitive/menu";
import { LanguagesIcon } from "@anyhunt/ui/icons/languages-icon";
import { ChevronRightIcon } from "@anyhunt/ui/icons/chevron-right-icon";

import { SUPPORTED_LANGUAGES } from "../ai-menu-items-constants";

export function LanguageSelectionSubmenu({
  editor,
}: {
  editor: Editor | null;
}) {
  const [searchValue] = useComboboxValueState();
  const { state, updateState } = useAiMenuState();

  const availableLanguages = useMemo(() => {
    return filterMenuItems(
      { items: SUPPORTED_LANGUAGES },
      searchValue
    );
  }, [searchValue]);

  const handleLanguageSelection = useCallback(
    (selectedLanguageCode: Language) => {
      if (!editor) return;

      const { insertAt, isSelection, context } = getContextAndInsertAt(editor);

      updateState({ language: selectedLanguageCode });

      const langOptions: TextOptions = {
        stream: true,
        format: "rich-text",
        insertAt,
        regenerate: !isSelection,
      };

      if (state.tone) {
        langOptions.tone = state.tone;
      }

      if (isSelection) {
        langOptions.text = context;
      }

      editor.chain().aiTranslate(selectedLanguageCode, langOptions).run();
    },
    [editor, state.tone, updateState]
  );

  const languageMenuItems = (
    <>
      {availableLanguages.length > 0 && (
        <MenuGroupLabel>Languages</MenuGroupLabel>
      )}
      {availableLanguages.map((language) => (
        <MenuItem
          key={language.value}
          onClick={() =>
            language.value &&
            handleLanguageSelection(language.value as Language)
          }
          render={
            <Button data-style="ghost">
              <LanguagesIcon className="tiptap-button-icon" />
              <span className="tiptap-button-text">{language.label}</span>
            </Button>
          }
        />
      ))}
    </>
  );

  if (searchValue) {
    return languageMenuItems;
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
                  <LanguagesIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">Languages</span>
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
          <MenuGroup>{languageMenuItems}</MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  );
}
