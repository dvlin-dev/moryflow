---
id: system_get_battery_status
title: 获取电池状态
description: 读取电池电量与充电状态
keywords: [system, battery]
argumentsPrompt: 无
---

```applescript
set batteryInfo to do shell script "pmset -g batt"
return batteryInfo
```
