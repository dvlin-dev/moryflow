---
id: system_toggle_dark_mode
title: 切换深色模式
description: 切换系统深色模式
keywords: [system, dark-mode]
argumentsPrompt: 无
---

```applescript
tell application "System Events"
  tell appearance preferences
    set dark mode to not dark mode
    if dark mode then
      return "dark"
    else
      return "light"
    end if
  end tell
end tell
```
