---
id: mail_mail_get_email
title: 获取单封邮件
description: 按条件读取一封邮件
keywords: [mail]
argumentsPrompt: 无
---

```applescript
set matchSubject to --MCP_INPUT:subject
set matchSender to --MCP_INPUT:sender
set mailboxName to --MCP_INPUT:mailbox
set accountName to --MCP_INPUT:account
set unreadOnly to --MCP_INPUT:unread_only
set includeBody to --MCP_INPUT:include_body

tell application "Mail"
  if accountName is not "" then
    if not (exists account accountName) then
      error "account_not_found: " & accountName
    end if

    set targetAccount to account accountName
    if mailboxName is "" or mailboxName is "INBOX" then
      set targetMessages to messages of inbox of targetAccount
    else if exists mailbox mailboxName of targetAccount then
      set targetMessages to messages of mailbox mailboxName of targetAccount
    else
      error "mailbox_not_found_in_account: " & mailboxName & " @ " & accountName
    end if
  else if mailboxName is "" or mailboxName is "INBOX" then
    set targetMessages to messages of inbox
  else if exists mailbox mailboxName then
    set targetMessages to messages of mailbox mailboxName
  else
    set targetMessages to messages of inbox
  end if

  repeat with oneMessage in targetMessages
    set okToUse to true
    if matchSubject is not "" and (subject of oneMessage does not contain matchSubject) then
      set okToUse to false
    end if
    if matchSender is not "" and (sender of oneMessage does not contain matchSender) then
      set okToUse to false
    end if
    if unreadOnly and (read status of oneMessage) then
      set okToUse to false
    end if

    if okToUse then
      set summaryText to ((sender of oneMessage) & " | " & (subject of oneMessage) & " | " & ((date received of oneMessage) as text))
      if includeBody then
        return summaryText & "

" & content of oneMessage
      end if
      return summaryText
    end if
  end repeat
end tell
return ""
```
