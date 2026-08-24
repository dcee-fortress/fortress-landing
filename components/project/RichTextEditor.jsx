"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Icon from "@/components/icon/icon"

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

function countPlainText(html) {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").length
  }

  const temp = document.createElement("div")
  temp.innerHTML = html
  return temp.textContent?.length ?? 0
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start typing…",
  minHeight = 256,
  editorKey,
}) {
  const editorRef = useRef(null)
  const lastHtmlRef = useRef(value)
  const colorInputRef = useRef(null)
  const highlightInputRef = useRef(null)
  const [activeStates, setActiveStates] = useState({})

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

      if (command === "hiliteColor" && commandValue) {
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
    if (value !== lastHtmlRef.current) {
      editorRef.current.innerHTML = value || ""
      lastHtmlRef.current = value || ""
    }
  }, [value, editorKey])

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

  const insertLink = () => {
    focusEditor()
    const url = window.prompt("Enter link URL")
    if (!url) return
    runCommand("createLink", url)
  }

  const isEmpty = !value || value === "<br>" || countPlainText(value) === 0

  return (
    <div className="rich-text-editor overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
        <ToolbarButton icon="minus" label="Horizontal line" onClick={() => runCommand("insertHorizontalRule")} />
        <ToolbarButton icon="remove-formatting" label="Clear formatting" onClick={() => runCommand("removeFormat")} />
      </div>

      <div className="relative">
        {isEmpty ? (
          <p className="pointer-events-none absolute left-4 top-4 text-sm text-zinc-400">{placeholder}</p>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onBlur={syncActiveStates}
          onFocus={syncActiveStates}
          className="rich-text-editor__content prose prose-sm max-w-none px-4 py-4 focus:outline-none"
          style={{
            minHeight,
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        />
      </div>
    </div>
  )
}

export { countPlainText }
