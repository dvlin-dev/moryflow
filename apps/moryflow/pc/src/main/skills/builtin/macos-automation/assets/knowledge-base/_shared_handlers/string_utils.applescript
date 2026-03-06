on trimText(inputText)
  set text item delimiters to {" ", tab, return, linefeed}
  set parts to text items of inputText
  set text item delimiters to " "
  set outputText to parts as text
  set text item delimiters to ""
  return outputText
end trimText
