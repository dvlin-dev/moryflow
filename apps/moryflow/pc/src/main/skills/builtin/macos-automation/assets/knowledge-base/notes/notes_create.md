---
id: notes_notes_create
title: 创建笔记
description: 创建纯文本笔记
keywords: [notes]
argumentsPrompt: 无
---

```applescript
set noteTitle to --MCP_INPUT:title
set noteBody to --MCP_INPUT:content

tell application "Notes"
  activate
  make new note with properties {name:noteTitle, body:noteBody}
end tell
return "Note created: " & noteTitle
```
