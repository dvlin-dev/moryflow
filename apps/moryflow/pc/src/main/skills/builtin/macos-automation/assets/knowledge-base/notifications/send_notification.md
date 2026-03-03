---
id: notifications_send_notification
title: 发送通知
description: 显示系统通知
keywords: [notification]
argumentsPrompt: 无
---

```applescript
set notifyTitle to --MCP_INPUT:title
set notifyBody to --MCP_INPUT:message
set notifySound to --MCP_INPUT:sound
if notifySound is "" then
  display notification notifyBody with title notifyTitle
else
  display notification notifyBody with title notifyTitle sound name notifySound
end if
return "Notification sent"
```
