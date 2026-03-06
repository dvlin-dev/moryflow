---
id: notes_notes_get
title: 获取笔记
description: 按标题获取笔记正文
keywords: [notes]
argumentsPrompt: 无
---

```applescript
set noteTitle to --MCP_INPUT:title
set folderName to --MCP_INPUT:folder

tell application "Notes"
  if folderName is "" then
    set matchedNotes to every note whose name is noteTitle
  else
    if exists folder folderName then
      set matchedNotes to every note of folder folderName whose name is noteTitle
    else
      set matchedNotes to {}
    end if
  end if

  if (count of matchedNotes) = 0 then
    return ""
  end if

  set targetNote to item 1 of matchedNotes
  return body of targetNote
end tell
```
