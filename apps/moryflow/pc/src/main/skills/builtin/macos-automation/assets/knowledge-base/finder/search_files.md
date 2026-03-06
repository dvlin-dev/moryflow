---
id: finder_search_files
title: 按名称搜索文件
description: 使用 mdfind 搜索文件名
keywords: [finder, search]
argumentsPrompt: 无
---

```applescript
set keyword to --MCP_INPUT:query
set locationPath to --MCP_INPUT:location
if locationPath is "~" then
  set locationPath to POSIX path of (path to home folder)
else if locationPath starts with "~/" then
  set locationPath to (POSIX path of (path to home folder)) & (text 3 thru -1 of locationPath)
end if
set shellCmd to "mdfind -onlyin " & quoted form of locationPath & " " & quoted form of keyword
set resultText to do shell script shellCmd
return resultText
```
