---
id: notes_notes_search
title: 搜索笔记
description: 按关键词搜索笔记
keywords: [notes]
argumentsPrompt: 无
---

```applescript
set queryText to --MCP_INPUT:query
set folderName to --MCP_INPUT:folder
set maxCount to --MCP_INPUT:limit
set includeBody to --MCP_INPUT:include_body
set outputLines to {}

tell application "Notes"
  if folderName is "" then
    set candidateNotes to notes
  else
    if exists folder folderName then
      set candidateNotes to notes of folder folderName
    else
      set candidateNotes to {}
    end if
  end if

  repeat with oneNote in candidateNotes
    set noteName to name of oneNote
    set noteBody to body of oneNote
    if noteName contains queryText or noteBody contains queryText then
      if includeBody then
        set end of outputLines to (noteName & "
" & noteBody)
      else
        set end of outputLines to noteName
      end if
      if (count of outputLines) ≥ maxCount then
        exit repeat
      end if
    end if
  end repeat
end tell
if (count of outputLines) = 0 then
  return ""
end if
set AppleScript's text item delimiters to linefeed
set outputText to outputLines as text
set AppleScript's text item delimiters to ""
return outputText
```
