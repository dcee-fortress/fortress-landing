"use client"

import { useEffect, useRef } from "react"
import { commitFormulaInput } from "@/lib/materialScheduleFormulas"

export default function MaterialScheduleFormulaCell({
  rawValue,
  formulaValue = "",
  fallbackDisplay = "",
  formatDisplay,
  onChange,
  onLiveChange,
  align = "left",
  numeric = false,
  onSelect,
  isSelected = false,
  columnLabel = "",
}) {
  const inputRef = useRef(null)
  const focusedRef = useRef(false)
  const draftRef = useRef("")
  const source = formulaValue || String(rawValue ?? "")
  const sourceRef = useRef(source)
  sourceRef.current = source

  const storedText = String(rawValue ?? "").trim()
  const autoAnswer = storedText === "" ? String(fallbackDisplay ?? "").trim() : ""
  const idleValue =
    storedText !== ""
      ? formatDisplay
        ? formatDisplay(rawValue)
        : String(rawValue ?? "")
      : autoAnswer
  const showAnswerWeight = numeric && Boolean(idleValue)

  useEffect(() => {
    if (focusedRef.current || !inputRef.current) return
    inputRef.current.value = idleValue
  }, [idleValue])

  const showFormatted = (value) => {
    if (!inputRef.current) return
    const text = String(value ?? "").trim()
    if (!text) {
      inputRef.current.value = autoAnswer
      return
    }
    inputRef.current.value = formatDisplay ? formatDisplay(value) : text
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={numeric ? "decimal" : "text"}
      defaultValue={idleValue}
      placeholder={autoAnswer ? "" : numeric ? "0 or =3*4" : ""}
      aria-label={columnLabel}
      className={`w-full min-w-[7rem] rounded-md border bg-white px-2 py-1.5 text-sm outline-none ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      } ${align === "right" ? "text-right tabular-nums" : "text-left"} ${
        showAnswerWeight ? "font-bold text-zinc-900" : "text-zinc-900"
      }`}
      onFocus={(event) => {
        focusedRef.current = true
        draftRef.current = sourceRef.current
        event.target.value = sourceRef.current
        onSelect?.()
        onLiveChange?.(sourceRef.current)
      }}
      onChange={(event) => {
        draftRef.current = event.target.value
        onLiveChange?.(event.target.value)
      }}
      onBlur={() => {
        focusedRef.current = false
        const { value, formula } = commitFormulaInput(draftRef.current, numeric)
        onChange(value, formula)
        onLiveChange?.(null)
        showFormatted(value)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          event.preventDefault()
          draftRef.current = sourceRef.current
          event.currentTarget.value = sourceRef.current
          event.currentTarget.blur()
        }
      }}
    />
  )
}
