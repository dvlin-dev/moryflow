---
id: calendar_calendar_add_event
title: 新增日历事件
description: 创建日历事件
keywords: [calendar]
argumentsPrompt: 无
---

```applescript
set eventTitle to --MCP_INPUT:title
set startDateText to --MCP_INPUT:start_date
set endDateText to --MCP_INPUT:end_date
set calendarName to --MCP_INPUT:calendar
set startDateValue to date startDateText
set endDateValue to date endDateText

tell application "Calendar"
  if not (exists calendar calendarName) then
    error "Calendar not found: " & calendarName
  end if
  tell calendar calendarName
    make new event with properties {summary:eventTitle, start date:startDateValue, end date:endDateValue}
  end tell
end tell
return "Event created: " & eventTitle
```
