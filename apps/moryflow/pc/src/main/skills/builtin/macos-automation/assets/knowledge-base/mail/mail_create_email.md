---
id: mail_mail_create_email
title: 创建邮件草稿
description: 创建 Mail 草稿
keywords: [mail]
argumentsPrompt: 无
---

```applescript
set recipientEmail to --MCP_INPUT:recipient
set mailSubject to --MCP_INPUT:subject
set mailBody to --MCP_INPUT:body

tell application "Mail"
  activate
  set newMessage to make new outgoing message with properties {subject:mailSubject, content:mailBody, visible:true}
  tell newMessage
    make new to recipient at end of to recipients with properties {address:recipientEmail}
  end tell
end tell
return "Draft created"
```
