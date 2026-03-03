---
id: iterm_iterm_run
title: iTerm 执行命令
description: 在 iTerm 运行命令
keywords: [iterm]
argumentsPrompt: 无
---

```applescript
set shellCommand to --MCP_INPUT:command
set shouldNewWindow to --MCP_INPUT:new_window

tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile
  end if
  if shouldNewWindow then
    create window with default profile
  end if
  tell current session of current window
    write text shellCommand
  end tell
end tell
return "Command executed in iTerm"
```
