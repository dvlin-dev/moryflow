---
id: finder_get_selected_files
title: 获取 Finder 选中文件
description: 返回 Finder 当前选中的文件路径
keywords: [finder, selection]
argumentsPrompt: 无
---

```applescript
tell application "Finder"
  set selectedItems to selection
  if selectedItems is {} then
    return ""
  end if
  set outputLines to {}
  repeat with itemRef in selectedItems
    set end of outputLines to POSIX path of (itemRef as alias)
  end repeat
  if (count of outputLines) = 0 then
    return ""
  end if
  set AppleScript's text item delimiters to linefeed
  set outputText to outputLines as text
  set AppleScript's text item delimiters to ""
  return outputText
end tell
```
