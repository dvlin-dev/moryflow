---
id: notes_notes_list
title: 列出笔记
description: 列出笔记标题
keywords: [notes]
argumentsPrompt: 无
---

```applescript
set folderName to --MCP_INPUT:folder
set outputLines to {}

tell application "Notes"
  if folderName is "" then
    repeat with oneNote in notes
      set end of outputLines to name of oneNote
    end repeat
  else
    if exists folder folderName then
      repeat with oneNote in notes of folder folderName
        set end of outputLines to name of oneNote
      end repeat
    end if
  end if
end tell
if (count of outputLines) = 0 then
  return ""
end if
set AppleScript's text item delimiters to linefeed
set outputText to outputLines as text
set AppleScript's text item delimiters to ""
return outputText
```
