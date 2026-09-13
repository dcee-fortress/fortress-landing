"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import FormulaSuggestionMenu from "@/components/project/FormulaSuggestionMenu"
import {
  rememberMaterialFormula,
  searchMaterialFormulaSuggestions,
} from "@/lib/materialFormulaMemory"
import { commitFormulaInput, draftFormulaInput, isFormula } from "@/lib/materialScheduleFormulas"

const TEXT_KEYBOARD_PROPS = {
  type: "text",
  inputMode: "text",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
  enterKeyHint: "enter",
}

export default function MaterialScheduleFormulaCell({
  projectId,
  description = "",
  columnKey = "",
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
  const [draft, setDraft] = useState(source)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const storedText = String(rawValue ?? "").trim()
  const autoAnswer = storedText === "" ? String(fallbackDisplay ?? "").trim() : ""
  const idleValue =
    storedText !== ""
      ? formatDisplay
        ? formatDisplay(rawValue)
        : String(rawValue ?? "")
      : autoAnswer
  const showAnswerWeight = numeric && Boolean(idleValue)

  const suggestions = useMemo(
    () =>
      dismissed || !menuOpen
        ? []
        : searchMaterialFormulaSuggestions({
            projectId,
            description,
            columnKey,
            query: draft,
            limit: 8,
          }),
    [projectId, description, columnKey, draft, dismissed, menuOpen]
  )

  const highlightedIndex = Math.min(activeIndex, Math.max(0, suggestions.length - 1))

  useEffect(() => {
    if (focusedRef.current || !inputRef.current) return
    inputRef.current.value = idleValue
  }, [idleValue])

  useEffect(() => {
    setActiveIndex(0)
  }, [draft, description, columnKey])

  const showFormatted = (value) => {
    if (!inputRef.current) return
    const text = String(value ?? "").trim()
    if (!text) {
      inputRef.current.value = autoAnswer
      return
    }
    inputRef.current.value = formatDisplay ? formatDisplay(value) : text
  }

  const persistDraft = (text) => {
    const { value, formula } = draftFormulaInput(text)
    onChange(value, formula)
  }

  const rememberIfFormula = (formula) => {
    if (!isFormula(formula)) return
    rememberMaterialFormula({
      projectId,
      description,
      columnKey,
      columnLabel,
      formula,
    })
  }

  const applyFormula = (formula) => {
    const next = String(formula ?? "").trim()
    draftRef.current = next
    setDraft(next)
    if (inputRef.current) inputRef.current.value = next
    persistDraft(next)
    onLiveChange?.(next)
    rememberIfFormula(next)
    setMenuOpen(false)
    setDismissed(true)
  }

  const dismissMenu = () => {
    setMenuOpen(false)
    setDismissed(true)
  }

  return (
    <div className="relative min-w-[7rem]">
      <input
        ref={inputRef}
        {...TEXT_KEYBOARD_PROPS}
        defaultValue={idleValue}
        placeholder={autoAnswer ? "" : numeric ? "0 or =3*4" : ""}
        aria-label={columnLabel}
        aria-autocomplete="list"
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
          setDraft(sourceRef.current)
          event.target.value = sourceRef.current
          setDismissed(false)
          setMenuOpen(isFormula(sourceRef.current) || sourceRef.current === "=")
          onSelect?.()
          onLiveChange?.(sourceRef.current)
        }}
        onChange={(event) => {
          const text = event.target.value
          draftRef.current = text
          setDraft(text)
          setDismissed(false)
          setMenuOpen(text.trim().startsWith("="))
          onLiveChange?.(text)
          persistDraft(text)
        }}
        onBlur={() => {
          focusedRef.current = false
          const { value, formula } = commitFormulaInput(draftRef.current, numeric)
          rememberIfFormula(formula || draftRef.current)
          onChange(value, formula)
          onLiveChange?.(null)
          showFormatted(value)
          setMenuOpen(false)
        }}
        onKeyDown={(event) => {
          if (menuOpen && suggestions.length > 0) {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1))
              return
            }

            if (event.key === "ArrowUp") {
              event.preventDefault()
              setActiveIndex((current) => Math.max(current - 1, 0))
              return
            }

            if (event.key === "Tab" && suggestions[highlightedIndex]) {
              event.preventDefault()
              applyFormula(suggestions[highlightedIndex].formula)
              return
            }

            if (event.key === "x" || event.key === "X") {
              event.preventDefault()
              dismissMenu()
              return
            }

            if (event.key === "Escape") {
              event.preventDefault()
              dismissMenu()
              return
            }
          }

          if (event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === "Escape") {
            event.preventDefault()
            draftRef.current = sourceRef.current
            setDraft(sourceRef.current)
            event.currentTarget.value = sourceRef.current
            persistDraft(sourceRef.current)
            event.currentTarget.blur()
          }
        }}
      />

      {menuOpen ? (
        <FormulaSuggestionMenu
          suggestions={suggestions}
          activeIndex={highlightedIndex}
          onHover={setActiveIndex}
          onSelect={applyFormula}
          onDismiss={dismissMenu}
        />
      ) : null}
    </div>
  )
}
