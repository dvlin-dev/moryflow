---
id: notes_notes_create_raw_html
title: 创建 HTML 笔记
description: 创建带 HTML 的笔记
keywords: [notes]
argumentsPrompt: 无
---

```applescript
set noteTitle to --MCP_INPUT:title
set noteHtml to --MCP_INPUT:html

tell application "Notes"
  activate
  make new note with properties {name:noteTitle, body:noteHtml}
end tell
return "HTML note created: " & noteTitle
```
