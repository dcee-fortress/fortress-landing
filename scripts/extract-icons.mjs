import fs from "fs"
import icons from "../components/icon/icons.js"

const used = [
  "loader",
  "chevron-left",
  "x",
  "plus",
  "info",
  "file-text",
  "chevron-right",
  "arrow-left",
  "settings-2",
  "align-justify",
  "trash-2",
  "save",
  "search",
  "arrow-right",
  "clock",
  "table",
  "file-down",
  "circle-question-mark",
  "hard-hat",
  "calendar-days",
  "calendar-range",
  "chart-bar",
  "image",
  "camera",
  "file",
  "paperclip",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "list",
  "list-ordered",
  "align-left",
  "align-center",
  "align-right",
  "align-justify",
  "undo",
  "redo",
  "link",
  "highlighter",
  "heading",
  "minus",
  "remove-formatting",
  "indent-increase",
  "indent-decrease",
  "type",
  "truck",
  "users",
  "fuel",
]

const subset = {}
for (const key of used) {
  if (!icons[key]) {
    console.warn("Missing icon:", key)
  } else {
    subset[key] = icons[key]
  }
}

const content = `const iconsUsed = ${JSON.stringify(subset, null, 2)}\nexport default iconsUsed\n`
fs.writeFileSync(new URL("../components/icon/iconsUsed.js", import.meta.url), content)
console.log("Written", Object.keys(subset).length, "icons,", content.length, "bytes")
