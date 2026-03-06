---
id: system_quit_app
title: 退出应用
description: 退出指定应用，可选择强退
keywords: [system, quit]
argumentsPrompt: 无
---

```applescript
set appName to --MCP_INPUT:name
set forceQuit to --MCP_INPUT:force
tell application appName
  if forceQuit then
    quit saving no
  else
    quit
  end if
end tell
return "Quit: " & appName
```
