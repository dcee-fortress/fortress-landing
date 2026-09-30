"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Icon from "@/components/icon/icon"
import { cleanPastedHtml, extractRtfImages } from "@/lib/cleanPastedHtml"

const FONT_FAMILIES = [
  { label: "Calibri", value: "Calibri" },
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Courier New", value: "Courier New" },
  { label: "Verdana", value: "Verdana" },
]

const FONT_SIZES = [
  { label: "8", value: "1" },
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "18", value: "5" },
  { label: "24", value: "6" },
  { label: "36", value: "7" },
]

const BLOCK_STYLES = [
  { label: "Normal", value: "<p>" },
  { label: "Heading 1", value: "<h1>" },
  { label: "Heading 2", value: "<h2>" },
  { label: "Heading 3", value: "<h3>" },
]

const TEXT_COLORS = ["#000000", "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c"]
const HIGHLIGHT_COLORS = ["#ffffff", "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"]

function ToolbarDivider() {
  return <div className="mx-1 hidden h-6 w-px bg-zinc-300 sm:block" />
}

function ToolbarButton({ icon, label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-transparent bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {icon ? <Icon name={icon} size={15} /> : <span className="text-xs font-semibold">{label?.slice(0, 1)}</span>}
    </button>
  )
}

function ToolbarTextButton({ icon, label, onClick, tone }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      className={`inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2 text-xs font-medium transition ${
        tone === "danger"
          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  )
}

function getClosestElement(node, selector) {
  if (!node) return null
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return element?.closest(selector) ?? null
}

function moveToTableCell(currentCell, previous) {
  const row = currentCell.parentElement
  const table = currentCell.closest("table")
  if (!row || !table) return false

  const cells = [...row.querySelectorAll("th, td")]
  const index = cells.indexOf(currentCell)
  let nextCell = previous ? cells[index - 1] : cells[index + 1]

  if (!nextCell) {
    const rows = [...table.querySelectorAll("tr")]
    const rowIndex = rows.indexOf(row)
    const targetRow = previous ? rows[rowIndex - 1] : rows[rowIndex + 1]
    const targetCells = targetRow ? [...targetRow.querySelectorAll("th, td")] : []
    nextCell = previous ? targetCells.at(-1) : targetCells[0]
  }

  if (!nextCell) return false

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(nextCell)
  range.collapse(previous)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

function insertPlainTable() {
  document.execCommand(
    "insertHTML",
    false,
    `<table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <tbody>
        <tr>
          <td style="border:1px solid #d4d4d8; padding:8px 10px;">&nbsp;</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="border:1px solid #d4d4d8; padding:8px 10px;">&nbsp;</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px;">&nbsp;</td>
        </tr>
      </tbody>
    </table><p><br></p>`
  )
}

function placeCaretIn(element, atEnd = false) {
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(!atEnd)
  selection.removeAllRanges()
  selection.addRange(range)
}

function ensureSelectionInEditor(editor) {
  const selection = window.getSelection()
  const anchor = selection?.rangeCount ? selection.anchorNode : null
  if (!anchor || !editor.contains(anchor)) placeCaretIn(editor, true)
}

function addRowToTable(editor) {
  let cell = getClosestElement(window.getSelection()?.anchorNode, "th, td")
  if (cell && !editor.contains(cell)) cell = null
  const tables = editor.querySelectorAll("table")
  const lastTable = tables[tables.length - 1]
  const row = cell?.parentElement ?? lastTable?.rows[lastTable.rows.length - 1]
  if (!row) return false

  const newRow = row.cloneNode(true)
  for (const newCell of newRow.cells) {
    newCell.removeAttribute("rowspan")
    newCell.innerHTML = "<br>"
  }
  row.after(newRow)
  if (newRow.cells[0]) placeCaretIn(newRow.cells[0])
  return true
}

function downloadWordDocument(html, fileName) {
  const container = document.createElement("div")
  container.innerHTML = html
  container.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") || ""
    if (src && !/^(data:|https?:)/i.test(src)) image.setAttribute("src", new URL(src, window.location.origin).href)
  })
  const safeName = String(fileName || "document").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document"
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${safeName}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #a1a1aa;padding:6px 8px;vertical-align:top}</style></head><body>${container.innerHTML}</body></html>`
  const url = URL.createObjectURL(new Blob(["\ufeff", wordHtml], { type: "application/msword" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `${safeName}.doc`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function deleteTable(editor) {
  let table = getClosestElement(window.getSelection()?.anchorNode, "table")
  if (!table || !editor.contains(table)) {
    const tables = editor.querySelectorAll("table")
    table = tables[tables.length - 1]
  }
  if (!table) return false

  const after = table.nextElementSibling
  table.remove()
  if (!editor.textContent.trim() && !editor.querySelector("img, table, hr")) {
    editor.innerHTML = "<p><br></p>"
    placeCaretIn(editor.firstChild)
  } else if (after && editor.contains(after)) {
    placeCaretIn(after)
  }
  return true
}

function countPlainText(html) {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").length
  }

  const temp = document.createElement("div")
  temp.innerHTML = html
  return temp.textContent?.length ?? 0
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Could not read the pasted picture"))
    reader.readAsDataURL(file)
  })
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start typing…",
  minHeight = 256,
  editorKey,
  allowWordImport = false,
  wordExportFileName = "",
  tableTemplate = null,
  autoFocus = false,
}) {
  const editorRef = useRef(null)
  const lastHtmlRef = useRef(value)
  const colorInputRef = useRef(null)
  const highlightInputRef = useRef(null)
  const wordInputRef = useRef(null)
  const uploadingImagesRef = useRef(new WeakSet())
  const [activeStates, setActiveStates] = useState({})
  const [importStatus, setImportStatus] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const syncActiveStates = useCallback(() => {
    if (typeof document === "undefined") return

    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
    })
  }, [])

  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  const emitChange = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    lastHtmlRef.current = html
    onChange?.(html)
    syncActiveStates()
  }, [onChange, syncActiveStates])

  const runCommand = useCallback(
    (command, commandValue = null) => {
      focusEditor()

      if (command === "insertTable") {
        insertPlainTable()
      } else if (command === "hiliteColor" && commandValue) {
        if (!document.execCommand("hiliteColor", false, commandValue)) {
          document.execCommand("backColor", false, commandValue)
        }
      } else {
        document.execCommand(command, false, commandValue)
      }

      emitChange()
    },
    [emitChange, focusEditor]
  )

  useEffect(() => {
    if (!editorRef.current) return

    const next = value || ""
    const currentDom = editorRef.current.innerHTML
    const isFocused = document.activeElement === editorRef.current

    if (isFocused && currentDom) {
      lastHtmlRef.current = currentDom
      return
    }

    const needsHydration = currentDom === "" && next !== ""

    if (next !== lastHtmlRef.current || needsHydration) {
      editorRef.current.innerHTML = next
      lastHtmlRef.current = next
    }
  }, [value, editorKey])

  useEffect(() => {
    if (!autoFocus || !editorRef.current) return
    editorRef.current.focus({ preventScroll: true })
    placeCaretIn(editorRef.current, true)
  }, [autoFocus, editorKey])

  const addRow = () => {
    if (!editorRef.current) return
    focusEditor()
    if (addRowToTable(editorRef.current)) emitChange()
  }

  const removeTable = () => {
    if (!editorRef.current) return
    focusEditor()
    if (deleteTable(editorRef.current)) emitChange()
  }

  const insertTableTemplate = () => {
    if (!editorRef.current || !tableTemplate) return
    focusEditor()
    ensureSelectionInEditor(editorRef.current)
    document.execCommand("insertHTML", false, tableTemplate.html)
    emitChange()
  }

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p")
      document.execCommand("styleWithCSS", false, true)
    } catch {
      // Older browsers may ignore these commands.
    }
  }, [])

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return
      if (document.activeElement === editorRef.current) {
        syncActiveStates()
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [syncActiveStates])

  const handleKeyDown = (event) => {
    const mod = event.ctrlKey || event.metaKey

    if (event.key === "Tab") {
      const cell = getClosestElement(window.getSelection()?.anchorNode, "th, td")
      if (cell && editorRef.current?.contains(cell)) {
        event.preventDefault()
        if (moveToTableCell(cell, event.shiftKey)) {
          emitChange()
        }
        return
      }
    }

    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault()
      runCommand("bold")
    } else if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault()
      runCommand("italic")
    } else if (mod && event.key.toLowerCase() === "u") {
      event.preventDefault()
      runCommand("underline")
    } else if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault()
      runCommand("undo")
    } else if (mod && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
      event.preventDefault()
      runCommand("redo")
    }
  }

  const uploadPendingImages = useCallback(async () => {
    const root = editorRef.current
    if (!root) return
    const pending = [...root.querySelectorAll('img[src^="data:image/"]')].filter(
      (image) => !uploadingImagesRef.current.has(image)
    )
    if (pending.length === 0) return

    const { uploadDocumentImage } = await import("@/lib/progressReportPhotos")
    for (const image of pending) {
      uploadingImagesRef.current.add(image)
      try {
        const src = await uploadDocumentImage(image.getAttribute("src"))
        if (src && image.isConnected) {
          image.setAttribute("src", src)
          emitChange()
        }
      } catch {
        // The embedded copy stays in the document if the upload fails.
      }
    }
  }, [emitChange])

  const handlePaste = (event) => {
    const clipboard = event.clipboardData
    if (!clipboard) return

    const html = clipboard.getData("text/html")
    if (html) {
      event.preventDefault()
      const cleaned = cleanPastedHtml(html, {
        localImages: extractRtfImages(clipboard.getData("text/rtf")),
      })
      if (cleaned) {
        document.execCommand("insertHTML", false, cleaned)
      } else {
        document.execCommand("insertText", false, clipboard.getData("text/plain"))
      }
      emitChange()
      void uploadPendingImages()
      return
    }

    const pictures = [...(clipboard.files || [])].filter((file) => file.type.startsWith("image/"))
    if (pictures.length === 0) return
    event.preventDefault()
    void Promise.all(pictures.map(readFileAsDataUrl)).then((sources) => {
      editorRef.current?.focus()
      document.execCommand(
        "insertHTML",
        false,
        sources.map((src) => `<img src="${src}" alt="">`).join("")
      )
      emitChange()
      void uploadPendingImages()
    })
  }

  const handleWordImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!/\.docx$/i.test(file.name)) {
      setImportStatus(
        "Choose a .docx Word document. For an older .doc file, open it in Word and use Save As → Word Document (.docx)."
      )
      return
    }

    setIsImporting(true)
    setImportStatus(`Importing “${file.name}”…`)
    try {
      const { docxToHtml } = await import("@/lib/docxToHtml")
      const { html, skippedImages } = await docxToHtml(file)
      const root = editorRef.current
      if (!root) return

      const isBlank = countPlainText(root.innerHTML) === 0 && !root.querySelector("img, table")
      if (isBlank) root.innerHTML = html
      else root.insertAdjacentHTML("beforeend", html)
      emitChange()

      const skippedNote =
        skippedImages > 0
          ? ` ${skippedImages} picture${skippedImages === 1 ? " uses" : "s use"} a Word-only format (EMF/WMF) and could not be shown.`
          : ""
      const hasPictures = Boolean(root.querySelector('img[src^="data:image/"]'))
      setImportStatus(
        hasPictures
          ? `Imported “${file.name}”. Saving pictures…${skippedNote}`
          : `Imported “${file.name}”.${skippedNote}`
      )
      if (hasPictures) {
        await uploadPendingImages()
        setImportStatus(`Imported “${file.name}”.${skippedNote}`)
      }
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Could not read this Word document.")
    } finally {
      setIsImporting(false)
    }
  }

  const insertLink = () => {
    focusEditor()
    const url = window.prompt("Enter link URL")
    if (!url) return
    runCommand("createLink", url)
  }

  const isEmpty =
    !value || value === "<br>" || (countPlainText(value) === 0 && !/<(img|table)\b/i.test(value))

  const clearDocument = () => {
    if (!editorRef.current) return
    if (!window.confirm("Remove the whole document from this page? This clears all imported and typed content.")) return
    editorRef.current.innerHTML = ""
    setImportStatus("")
    emitChange()
    editorRef.current.focus({ preventScroll: true })
    placeCaretIn(editorRef.current)
  }

  return (
    <div className="rich-text-editor overflow-x-auto rounded-none border border-zinc-300 bg-white shadow-none">
      <div className="no-print flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-2">
        <ToolbarButton icon="undo" label="Undo (Ctrl+Z)" onClick={() => runCommand("undo")} />
        <ToolbarButton icon="redo" label="Redo (Ctrl+Y)" onClick={() => runCommand("redo")} />

        <ToolbarDivider />

        <select
          aria-label="Font family"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) runCommand("fontName", event.target.value)
            event.target.value = ""
          }}
          className="h-8 max-w-[7.5rem] rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700"
        >
          <option value="" disabled>
            Font
          </option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Font size"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) runCommand("fontSize", event.target.value)
            event.target.value = ""
          }}
          className="h-8 w-14 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700"
        >
          <option value="" disabled>
            Size
          </option>
          {FONT_SIZES.map((size) => (
            <option key={size.label} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Text style"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) runCommand("formatBlock", event.target.value)
            event.target.value = ""
          }}
          className="h-8 max-w-[7.5rem] rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700"
        >
          <option value="" disabled>
            Style
          </option>
          {BLOCK_STYLES.map((style) => (
            <option key={style.label} value={style.value}>
              {style.label}
            </option>
          ))}
        </select>

        <ToolbarDivider />

        <ToolbarButton icon="bold" label="Bold (Ctrl+B)" active={activeStates.bold} onClick={() => runCommand("bold")} />
        <ToolbarButton
          icon="italic"
          label="Italic (Ctrl+I)"
          active={activeStates.italic}
          onClick={() => runCommand("italic")}
        />
        <ToolbarButton
          icon="underline"
          label="Underline (Ctrl+U)"
          active={activeStates.underline}
          onClick={() => runCommand("underline")}
        />
        <ToolbarButton
          icon="strikethrough"
          label="Strikethrough"
          active={activeStates.strikeThrough}
          onClick={() => runCommand("strikeThrough")}
        />

        <ToolbarDivider />

        <div className="flex items-center gap-1">
          <ToolbarButton
            icon="type"
            label="Text color"
            onClick={() => colorInputRef.current?.click()}
          />
          <input
            ref={colorInputRef}
            type="color"
            className="sr-only"
            defaultValue="#000000"
            onChange={(event) => runCommand("foreColor", event.target.value)}
          />
          <div className="hidden items-center gap-0.5 sm:flex">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={`Text color ${color}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  runCommand("foreColor", color)
                }}
                className="h-4 w-4 rounded-full border border-zinc-300"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            icon="highlighter"
            label="Highlight color"
            onClick={() => highlightInputRef.current?.click()}
          />
          <input
            ref={highlightInputRef}
            type="color"
            className="sr-only"
            defaultValue="#fef08a"
            onChange={(event) => runCommand("hiliteColor", event.target.value)}
          />
          <div className="hidden items-center gap-0.5 sm:flex">
            {HIGHLIGHT_COLORS.filter((color) => color !== "#ffffff").map((color) => (
              <button
                key={color}
                type="button"
                title={`Highlight ${color}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  runCommand("hiliteColor", color)
                }}
                className="h-4 w-4 rounded-sm border border-zinc-300"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <ToolbarDivider />

        <ToolbarButton
          icon="align-left"
          label="Align left"
          active={activeStates.justifyLeft}
          onClick={() => runCommand("justifyLeft")}
        />
        <ToolbarButton
          icon="align-center"
          label="Align center"
          active={activeStates.justifyCenter}
          onClick={() => runCommand("justifyCenter")}
        />
        <ToolbarButton
          icon="align-right"
          label="Align right"
          active={activeStates.justifyRight}
          onClick={() => runCommand("justifyRight")}
        />
        <ToolbarButton
          icon="align-justify"
          label="Justify"
          active={activeStates.justifyFull}
          onClick={() => runCommand("justifyFull")}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon="list"
          label="Bullet list"
          active={activeStates.insertUnorderedList}
          onClick={() => runCommand("insertUnorderedList")}
        />
        <ToolbarButton
          icon="list-ordered"
          label="Numbered list"
          active={activeStates.insertOrderedList}
          onClick={() => runCommand("insertOrderedList")}
        />
        <ToolbarButton icon="indent-increase" label="Increase indent" onClick={() => runCommand("indent")} />
        <ToolbarButton icon="indent-decrease" label="Decrease indent" onClick={() => runCommand("outdent")} />

        <ToolbarDivider />

        <ToolbarButton icon="link" label="Insert link" onClick={insertLink} />
        <ToolbarButton icon="table" label="Insert table" onClick={() => runCommand("insertTable")} />
        {tableTemplate ? (
          <>
            <ToolbarDivider />
            <ToolbarTextButton icon="table" label={tableTemplate.label} onClick={insertTableTemplate} />
            <ToolbarTextButton icon="plus" label="Add row" onClick={addRow} />
            <ToolbarTextButton icon="trash-2" label="Delete table" onClick={removeTable} tone="danger" />
            <ToolbarDivider />
          </>
        ) : (
          <>
            <ToolbarButton icon="plus" label="Add table row" onClick={addRow} />
            <ToolbarButton icon="trash-2" label="Delete table" onClick={removeTable} />
          </>
        )}
        <ToolbarButton icon="minus" label="Horizontal line" onClick={() => runCommand("insertHorizontalRule")} />
        <ToolbarButton icon="remove-formatting" label="Clear formatting" onClick={() => runCommand("removeFormat")} />
      </div>

      <div className="relative">
        {isEmpty ? (
          <p className="pointer-events-none absolute left-4 top-4 text-sm text-zinc-400">{placeholder}</p>
        ) : null}
        <div
          ref={editorRef}
          contentEditable="true"
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          spellCheck
          onInput={emitChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onBlur={syncActiveStates}
          onFocus={syncActiveStates}
          className="rich-text-editor__content prose prose-sm max-w-none overflow-x-auto px-4 py-4 focus:outline-none"
          style={{
            minHeight,
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        />
      </div>

      {allowWordImport || wordExportFileName ? (
        <div className="no-print flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-3">
          {allowWordImport ? (
            <>
              <input
                ref={wordInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => void handleWordImport(event)}
                className="hidden"
              />
              <button
                type="button"
                disabled={isImporting}
                onClick={() => wordInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Icon name="file-text" size={14} />
                {isImporting ? "Importing…" : "Import Word document"}
              </button>
            </>
          ) : null}
          {wordExportFileName ? (
            <button
              type="button"
              onClick={() => downloadWordDocument(editorRef.current?.innerHTML || "", wordExportFileName)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <Icon name="file-text" size={14} />
              Download Word document
            </button>
          ) : null}
          <button
            type="button"
            disabled={isEmpty || isImporting}
            onClick={clearDocument}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="trash-2" size={14} />
            Remove document
          </button>
          <p className="min-w-0 flex-1 text-xs text-zinc-500">
            {importStatus ||
              (allowWordImport
                ? "Choose a .docx file to bring in its headings, tables and pictures. You can also copy from Word and paste straight into the page above."
                : "Download this document to open and edit it in MS Word.")}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export { countPlainText }
