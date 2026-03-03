---
id: system_launch_app
title: 启动应用
description: 启动指定应用
keywords: [system, launch]
argumentsPrompt: 无
---

```applescript
set appName to --MCP_INPUT:name
tell application appName
  activate
end tell
return "Launched: " & appName
```
