---
id: shortcuts_list_shortcuts
title: 列出快捷指令
description: 列出快捷指令名称
keywords: [shortcuts]
argumentsPrompt: 无
---

```applescript
set maxCount to --MCP_INPUT:limit
set listText to do shell script "shortcuts list"
set linesList to paragraphs of listText
if (count of linesList) > maxCount then
  set linesList to items 1 thru maxCount of linesList
end if
if (count of linesList) = 0 then
  return ""
end if
set AppleScript's text item delimiters to linefeed
set outputText to linesList as text
set AppleScript's text item delimiters to ""
return outputText
```
