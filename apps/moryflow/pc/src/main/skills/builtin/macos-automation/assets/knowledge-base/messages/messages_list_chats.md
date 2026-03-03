---
id: messages_messages_list_chats
title: 列出消息会话
description: 列出 Messages 聊天会话
keywords: [messages]
argumentsPrompt: 无
---

```applescript
set includeDetails to --MCP_INPUT:include_participant_details
set outputLines to {}

tell application "Messages"
  repeat with oneChat in chats
    set lineText to id of oneChat as text
    if includeDetails then
      set lineText to lineText & " | " & (name of oneChat as text)
    end if
    set end of outputLines to lineText
  end repeat
end tell
if (count of outputLines) = 0 then
  return ""
end if
set AppleScript's text item delimiters to linefeed
set outputText to outputLines as text
set AppleScript's text item delimiters to ""
return outputText
```
