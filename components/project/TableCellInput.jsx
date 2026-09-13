"use client"

import { useEffect, useRef, useState } from "react"

function toInputText(value) {
  return value == null ? "" : String(value)
}

export default function TableCellInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "",
  align = "left",
  inputMode = "text",
  className = "",
  id,
  "aria-label": ariaLabel,
}) {
  const focusedRef = useRef(false)
  const [draft, setDraft] = useState(() => toInputText(value))

  useEffect(() => {
    if (!focusedRef.current) setDraft(toInputText(value))
  }, [value])

  return (
    <input
      id={id}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="next"
      aria-label={ariaLabel || placeholder}
      value={draft}
      placeholder={placeholder}
      onFocus={() => {
        focusedRef.current = true
        onFocus?.()
      }}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        onChange?.(next)
      }}
      onBlur={() => {
        focusedRef.current = false
        const next = draft ?? ""
        if (toInputText(value) !== next) onChange?.(next)
        onBlur?.()
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={`w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 ${
        align === "right" ? "text-right tabular-nums" : ""
      } ${className}`}
    />
  )
}
