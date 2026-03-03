---
id: mail_mail_list_emails
title: 列出邮件
description: 列出指定邮箱最近邮件
keywords: [mail]
argumentsPrompt: 无
---

```applescript
set mailboxName to --MCP_INPUT:mailbox
set maxCount to --MCP_INPUT:count
set unreadOnly to --MCP_INPUT:unread_only
set outputLines to {}

tell application "Mail"
  if exists mailbox mailboxName then
    set targetMessages to messages of mailbox mailboxName
  else
    set targetMessages to messages of inbox
  end if

  set counter to 0
  repeat with oneMessage in targetMessages
    if unreadOnly is false or read status of oneMessage is false then
      set counter to counter + 1
      set end of outputLines to ((sender of oneMessage) & " | " & (subject of oneMessage))
      if counter ≥ maxCount then
        exit repeat
      end if
    end if
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
