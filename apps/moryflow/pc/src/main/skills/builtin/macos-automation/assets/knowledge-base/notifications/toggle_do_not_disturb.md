---
id: notifications_toggle_do_not_disturb
title: 切换勿扰模式
description: 通过 FocusModes 开关尝试切换专注状态
keywords: [notification, focus]
argumentsPrompt: 无
---

```applescript
try
  set oldState to do shell script "defaults -currentHost read com.apple.controlcenter FocusModes 2>/dev/null || echo 0"
  if oldState is "0" then
    do shell script "defaults -currentHost write com.apple.controlcenter FocusModes -int 1"
    return "Do Not Disturb maybe enabled"
  else
    do shell script "defaults -currentHost write com.apple.controlcenter FocusModes -int 0"
    return "Do Not Disturb maybe disabled"
  end if
on error errMsg
  return "Unable to toggle reliably on this macOS version: " & errMsg
end try
```
