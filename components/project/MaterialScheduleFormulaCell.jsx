"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCloseOnOutsideScroll, useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
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
  wrapText,
  onSelect,
  isSelected = false,
  columnLabel = "",
  suggest = null,
}) {
  const inputRef = useRef(null)
  const focusedRef = useRef(false)
  const draftRef = useRef("")
  const lastEmittedRef = useRef("")
  const source = formulaValue || String(rawValue ?? "")
  const sourceRef = useRef(source)
  const [draft, setDraft] = useState(source)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuRect, setMenuRect] = useState(null)

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
  const closeFormulaMenu = useCallback(() => setMenuOpen(false), [])
  useCloseOnOutsideScroll(menuOpen && suggestions.length > 0, closeFormulaMenu)

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  useEffect(() => {
    if (!inputRef.current) return
    // Keep the field in sync when rows change from outside (Undo, paste, replace).
    if (focusedRef.current) {
      const loose = (value) => String(value ?? "").trim().replace(/%/g, "")
      // Ignore echoes of what this cell just saved (e.g. percent strip).
      if (
        source === draftRef.current ||
        source === lastEmittedRef.current ||
        loose(source) === loose(draftRef.current) ||
        loose(source) === loose(lastEmittedRef.current)
      ) {
        return
      }
      draftRef.current = source
      lastEmittedRef.current = source
      setDraft(source)
      inputRef.current.value = source || idleValue
      return
    }
    inputRef.current.value = idleValue
  }, [idleValue, source])

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
    lastEmittedRef.current = formula || String(value ?? "")
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

  const applyEntry = (text) => {
    const next = String(text ?? "")
    draftRef.current = next
    setDraft(next)
    if (inputRef.current) inputRef.current.value = next
    persistDraft(next)
    onLiveChange?.(next)
  }

  const entrySuggestions = useEntrySuggestions(suggest, applyEntry, { below: true })

  const refreshEntrySuggestions = (text, element) => {
    if (!suggest) return
    if (String(text ?? "").trim().startsWith("=")) entrySuggestions.close()
    else entrySuggestions.update(text, element)
  }

  // Descriptive / text cells wrap by default; numeric stay single-line unless forced.
  const shouldWrap = wrapText === true || (wrapText !== false && !numeric)

  const fieldClassName = `w-full min-w-[7rem] rounded-md border bg-white px-2 py-1.5 text-sm outline-none ${
    isSelected
      ? "border-blue-500 ring-2 ring-blue-500/20"
      : "border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
  } ${align === "right" ? "text-right tabular-nums" : "text-left"} ${
    showAnswerWeight ? "font-bold text-zinc-900" : "text-zinc-900"
  } ${
    shouldWrap
      ? "min-h-[2.75rem] resize-y whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug"
      : ""
  }`

  const fieldHandlers = {
    onFocus: (event) => {
      focusedRef.current = true
      draftRef.current = sourceRef.current
      setDraft(sourceRef.current)
      event.target.value = sourceRef.current
      setDismissed(false)
      setActiveIndex(0)
      setMenuRect(event.currentTarget.getBoundingClientRect())
      setMenuOpen(isFormula(sourceRef.current) || sourceRef.current === "=")
      refreshEntrySuggestions(sourceRef.current, event.currentTarget)
      onSelect?.()
      onLiveChange?.(sourceRef.current)
    },
    onChange: (event) => {
      const text = event.target.value
      draftRef.current = text
      setDraft(text)
      setDismissed(false)
      setActiveIndex(0)
      setMenuRect(event.currentTarget.getBoundingClientRect())
      setMenuOpen(text.trim().startsWith("="))
      refreshEntrySuggestions(text, event.currentTarget)
      onLiveChange?.(text)
      persistDraft(text)
    },
    onBlur: () => {
      focusedRef.current = false
      entrySuggestions.close()
      const { value, formula } = commitFormulaInput(draftRef.current, numeric)
      const nextSource = formula || String(value ?? "")
      const currentSource = formulaValue || String(rawValue ?? "")
      // Undo/replace may have already restored props — don't write the old draft back.
      if (nextSource === currentSource) {
        onLiveChange?.(null)
        showFormatted(value)
        setMenuOpen(false)
        return
      }
      rememberIfFormula(formula || draftRef.current)
      onChange(value, formula)
      onLiveChange?.(null)
      showFormatted(value)
      setMenuOpen(false)
    },
    onKeyDown: (event) => {
      if (entrySuggestions.isOpen && entrySuggestions.handleKeyDown(event)) return

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

      if (event.key === "Enter" && !shouldWrap) {
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
    },
  }

  return (
    <div className={`relative min-w-[7rem] ${shouldWrap ? "min-w-[10rem] max-w-[20rem]" : ""}`}>
      {shouldWrap ? (
        <textarea
          ref={inputRef}
          {...TEXT_KEYBOARD_PROPS}
          rows={2}
          defaultValue={idleValue}
          placeholder={autoAnswer ? "" : ""}
          aria-label={columnLabel}
          aria-autocomplete="list"
          className={fieldClassName}
          {...fieldHandlers}
        />
      ) : (
        <input
          ref={inputRef}
          {...TEXT_KEYBOARD_PROPS}
          defaultValue={idleValue}
          placeholder={autoAnswer ? "" : numeric ? "0 or =3*4" : ""}
          aria-label={columnLabel}
          aria-autocomplete="list"
          className={fieldClassName}
          {...fieldHandlers}
        />
      )}

      {menuOpen ? (
        <FormulaSuggestionMenu
          below
          rect={menuRect}
          suggestions={suggestions}
          activeIndex={highlightedIndex}
          onHover={setActiveIndex}
          onSelect={applyFormula}
          onDismiss={dismissMenu}
        />
      ) : null}
      {entrySuggestions.menu}
    </div>
  )
}
