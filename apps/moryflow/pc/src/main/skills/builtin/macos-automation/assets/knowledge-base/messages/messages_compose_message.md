---
id: messages_messages_compose_message
title: 发送或预填消息
description: 在 Messages 中发送或预填消息
keywords: [messages]
argumentsPrompt: 无
---

```applescript
use framework "Foundation"
use scripting additions

set targetRecipient to --MCP_INPUT:recipient
set messageBody to --MCP_INPUT:body
set autoSend to --MCP_INPUT:auto

if autoSend then
  tell application "Messages"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy targetRecipient of targetService
    send messageBody to targetBuddy
  end tell
  return "Message sent"
else
  set smsURL to "sms:" & targetRecipient
  if messageBody is not "" then
    set rawBody to current application's NSString's stringWithString:messageBody
    set encodedBody to (rawBody's stringByAddingPercentEncodingWithAllowedCharacters:(current application's NSCharacterSet's URLQueryAllowedCharacterSet())) as text
    set smsURL to smsURL & "&body=" & encodedBody
  end if
  do shell script "open " & quoted form of smsURL
  return "Messages opened with draft"
end if
```
