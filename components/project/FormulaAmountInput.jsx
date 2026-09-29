"use client"

import { useState } from "react"
import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
import { evaluateFormula, isFormula } from "@/lib/materialScheduleFormulas"
import { parsePlantCostAmount } from "@/lib/plantCostCalculations"

function formatIdleAmount(value) {
  if (value === "" || value === null || value === undefined) return ""
  const parsed = parsePlantCostAmount(value)
  if (parsed === null) return String(value)
  return String(parsed)
}

export function resolveFormulaAmount(text) {
  const source = String(text ?? "")
  if (!isFormula(source)) return { value: source, formula: "" }
  const result = evaluateFormula(source)
  return {
    value: result === null ? "" : String(result),
    formula: source.trim(),
  }
}

export default function FormulaAmountInput({
  value,
  formula = "",
  onChange,
  placeholder = "0 or =3*4",
  ariaLabel,
  minWidthClass = "min-w-[7rem]",
  onSelect,
  isSelected = false,
  suggest,
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")
  const applyText = (text) => {
    setDraft(text)
    const next = resolveFormulaAmount(text)
    onChange(next.value, next.formula)
  }
  const suggestions = useEntrySuggestions(suggest, applyText)
  const hasFormula = isFormula(formula)
  const invalid = hasFormula && evaluateFormula(formula) === null
  const idleText = invalid ? formula : formatIdleAmount(value)

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={ariaLabel}
        title={hasFormula ? `Formula: ${formula}` : undefined}
        value={focused ? draft : idleText}
        placeholder={placeholder}
        onFocus={() => {
          setDraft(hasFormula ? formula : formatIdleAmount(value))
          setFocused(true)
          onSelect?.()
        }}
        onChange={(event) => {
          applyText(event.target.value)
          suggestions.update(event.target.value, event.currentTarget)
        }}
        onBlur={() => {
          setFocused(false)
          suggestions.close()
        }}
        onKeyDown={(event) => {
          if (suggestions.handleKeyDown(event)) return
          if (event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className={`w-full ${minWidthClass} rounded-md border px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:ring-2 ${
          invalid
            ? "border-rose-400 text-rose-700 focus:border-rose-500 focus:ring-rose-500/15"
            : isSelected
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-500/15"
        } ${hasFormula && !focused ? "pl-7" : ""} ${
          hasFormula && !focused && !invalid ? "font-semibold text-zinc-900" : ""
        }`}
      />
      {hasFormula && !focused ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold italic ${
            invalid ? "text-rose-500" : "text-blue-600"
          }`}
        >
          fx
        </span>
      ) : null}
      {suggestions.menu}
    </div>
  )
}
