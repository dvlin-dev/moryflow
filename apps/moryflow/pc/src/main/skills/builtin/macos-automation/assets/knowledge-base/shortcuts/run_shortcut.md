---
id: shortcuts_run_shortcut
title: 运行快捷指令
description: 运行指定快捷指令
keywords: [shortcuts]
argumentsPrompt: 无
---

```applescript
set shortcutName to --MCP_INPUT:name
set shortcutInput to --MCP_INPUT:input
tell application "Shortcuts Events"
  if shortcutInput is "" then
    run shortcut shortcutName
  else
    run shortcut shortcutName with input shortcutInput
  end if
end tell
return "Shortcut executed: " & shortcutName
```
