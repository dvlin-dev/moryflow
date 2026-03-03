---
id: finder_quick_look_file
title: Quick Look 预览文件
description: 使用 qlmanage 预览文件
keywords: [finder, quicklook]
argumentsPrompt: 无
---

```applescript
set targetPath to --MCP_INPUT:path
do shell script "qlmanage -p " & quoted form of targetPath & " >/dev/null 2>&1 &"
return "Quick Look opened"
```
