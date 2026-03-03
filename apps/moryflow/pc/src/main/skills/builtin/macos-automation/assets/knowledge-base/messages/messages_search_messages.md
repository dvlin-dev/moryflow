---
id: messages_messages_search_messages
title: 搜索消息
description: 按条件搜索消息
keywords: [messages]
argumentsPrompt: 无
---

```applescript
set searchText to --MCP_INPUT:search_text
set senderFilter to --MCP_INPUT:sender
set chatFilter to --MCP_INPUT:chat_id
set maxCount to --MCP_INPUT:limit
set daysBack to --MCP_INPUT:days_back
set dbPath to POSIX path of ((path to home folder) as text) & "Library/Messages/chat.db"

on replaceText(findText, replaceValue, sourceText)
  set AppleScript's text item delimiters to findText
  set textItems to every text item of sourceText
  set AppleScript's text item delimiters to replaceValue
  set newText to textItems as text
  set AppleScript's text item delimiters to ""
  return newText
end replaceText

on escapeSqlLikeValue(inputText)
  return my replaceText("'", "''", inputText)
end escapeSqlLikeValue

set escapedSearchText to my escapeSqlLikeValue(searchText)
set escapedSenderFilter to my escapeSqlLikeValue(senderFilter)
set escapedChatFilter to my escapeSqlLikeValue(chatFilter)

set whereClause to "ifnull(message.text,'') LIKE '%" & escapedSearchText & "%'"
if senderFilter is not "" then
  set whereClause to whereClause & " AND ifnull(handle.id,'') LIKE '%" & escapedSenderFilter & "%'"
end if
if chatFilter is not "" then
  set whereClause to whereClause & " AND ifnull(chat.chat_identifier,'') LIKE '%" & escapedChatFilter & "%'"
end if
set whereClause to whereClause & " AND message.date > (strftime('%s','now','-" & daysBack & " days') - strftime('%s','2001-01-01')) * 1000000000"

set querySql to "SELECT datetime(message.date/1000000000 + strftime('%s','2001-01-01'),'unixepoch','localtime'), ifnull(handle.id,''), ifnull(chat.chat_identifier,''), ifnull(message.text,'') FROM message LEFT JOIN handle ON message.handle_id=handle.ROWID LEFT JOIN chat_message_join ON chat_message_join.message_id=message.ROWID LEFT JOIN chat ON chat_message_join.chat_id=chat.ROWID WHERE " & whereClause & " ORDER BY message.date DESC LIMIT " & maxCount
set shellCmd to "sqlite3 -separator ' | ' " & quoted form of dbPath & " " & quoted form of querySql
return do shell script shellCmd
```
