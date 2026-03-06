---
id: calendar_calendar_list_today
title: 列出今日日程
description: 列出今日事件
keywords: [calendar]
argumentsPrompt: 无
---

```applescript
set calendarName to --MCP_INPUT:calendar
set startOfDay to (current date)
set hours of startOfDay to 0
set minutes of startOfDay to 0
set seconds of startOfDay to 0
set endOfDay to startOfDay + (24 * 60 * 60)

tell application "Calendar"
  tell calendar calendarName
    set todaysEvents to (every event whose start date ≥ startOfDay and start date < endOfDay)
    set outputLines to {}
    repeat with oneEvent in todaysEvents
      set end of outputLines to ((summary of oneEvent) & " | " & ((start date of oneEvent) as text))
    end repeat
    if (count of outputLines) = 0 then
      return ""
    end if
    set AppleScript's text item delimiters to linefeed
    set outputText to outputLines as text
    set AppleScript's text item delimiters to ""
    return outputText
  end tell
end tell
```
