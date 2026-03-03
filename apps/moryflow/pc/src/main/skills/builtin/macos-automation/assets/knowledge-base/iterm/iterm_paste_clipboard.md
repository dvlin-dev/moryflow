---
id: iterm_iterm_paste_clipboard
title: iTerm 粘贴剪贴板
description: 将剪贴板粘贴到 iTerm
keywords: [iterm]
argumentsPrompt: 无
---

```applescript
tell application "iTerm"
  activate
  tell current session of current window
    write text (the clipboard as text)
  end tell
end tell
return "Clipboard pasted to iTerm"
```
