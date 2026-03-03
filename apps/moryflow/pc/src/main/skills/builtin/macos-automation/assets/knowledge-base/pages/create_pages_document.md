---
id: pages_create_pages_document
title: 创建 Pages 文档
description: 创建新 Pages 文档并写入内容
keywords: [pages]
argumentsPrompt: 无
---

```applescript
set documentText to --MCP_INPUT:content
tell application "Pages"
  activate
  set newDocument to make new document
  tell body text of newDocument
    set its text to documentText
  end tell
end tell
return "Pages document created"
```
