---
id: system_get_frontmost_app
title: 获取前台应用
description: 返回当前前台应用名称
keywords: [system, frontmost, app]
argumentsPrompt: 无
---

```applescript
tell application "System Events"
  return name of first process whose frontmost is true
end tell
```
