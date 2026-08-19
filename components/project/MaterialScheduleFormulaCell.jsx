"use client"

import { useState } from "react"
import { commitFormulaInput } from "@/lib/materialScheduleFormulas"

export default function MaterialScheduleFormulaCell({
  rawValue,
  formulaValue = "",
  fallbackDisplay = "",
  formatDisplay,
  onChange,
  align = "left",
  numeric = false,
  onSelect,
  isSelected = false,
  columnLabel = "",
}) {
  const [isEditing, setIsEditing] = useState(false)
  const editSource = formulaValue || String(rawValue ?? "")
  const [draft, setDraft] = useState(editSource)

  const storedText = String(rawValue ?? "").trim()
  const formatStoredValue = (value) => {
    if (formatDisplay) {
      return formatDisplay(value)
    }
    return String(value ?? "")
  }
  const visibleValue =
    storedText !== "" ? formatStoredValue(rawValue) : fallbackDisplay

  const startEditing = () => {
    onSelect?.()
    setDraft(formulaValue || String(rawValue ?? ""))
    setIsEditing(true)
  }

  const commit = () => {
    setIsEditing(false)
    const { value, formula } = commitFormulaInput(draft, numeric)
    onChange(value, formula)
  }

  return (
    <div
      className={`min-w-[7rem] ${isSelected ? "ring-2 ring-blue-400 ring-offset-1 rounded-md" : ""}`}
      onClick={() => onSelect?.()}
    >
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commit()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              setDraft(editSource)
              setIsEditing(false)
            }
          }}
          aria-label={columnLabel}
          placeholder={numeric ? "12 or =3*4" : undefined}
          className={`w-full rounded-md border border-blue-500 bg-white px-2 py-1.5 text-sm outline-none ring-2 ring-blue-500/20 ${
            align === "right" ? "text-right tabular-nums" : "text-left"
          }`}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className={`w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 ${
            align === "right" ? "text-right tabular-nums" : "text-left"
          } text-zinc-900`}
        >
          {visibleValue || "—"}
        </button>
      )}
    </div>
  )
}
