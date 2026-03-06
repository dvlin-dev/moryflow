---
id: messages_messages_get_messages
title: 获取最近消息
description: 读取最近消息
keywords: [messages]
argumentsPrompt: 无
---

```applescript
set maxCount to --MCP_INPUT:limit
set dbPath to POSIX path of ((path to home folder) as text) & "Library/Messages/chat.db"
set querySql to "SELECT datetime(message.date/1000000000 + strftime('%s','2001-01-01'),'unixepoch','localtime'), ifnull(handle.id,''), ifnull(message.text,'') FROM message LEFT JOIN handle ON message.handle_id=handle.ROWID ORDER BY message.date DESC LIMIT " & maxCount
set shellCmd to "sqlite3 -separator ' | ' " & quoted form of dbPath & " " & quoted form of querySql
return do shell script shellCmd
```
