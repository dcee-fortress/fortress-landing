"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const CARD_MIN_WIDTH = 256
const CARD_MAX_WIDTH = 448
const CARD_MAX_LIST_HEIGHT = 360
const CARD_CHROME_HEIGHT = 72

/** Closes an open card when the page scrolls or resizes, but not when the card itself scrolls. */
export function useCloseOnOutsideScroll(isOpen, close) {
  useEffect(() => {
    if (!isOpen) return undefined
    const onScroll = (event) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (target instanceof Element && target.closest("[data-suggestion-card]")) return
      close()
    }
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", close)
    }
  }, [isOpen, close])
}

/** Arrow keys and Page Up/Down move the highlight; Tab or Enter picks it; Esc closes. */
export function handleSuggestionKeys(event, { count, highlighted, setActiveIndex, choose, close, enterSelects = false }) {
  if (count === 0) return false
  const move = (step) => {
    event.preventDefault()
    setActiveIndex((current) => Math.max(0, Math.min(Math.min(current, count - 1) + step, count - 1)))
    return true
  }

  if (event.key === "ArrowDown") return move(1)
  if (event.key === "ArrowUp") return move(-1)
  if (event.key === "PageDown") return move(5)
  if (event.key === "PageUp") return move(-5)
  if ((event.key === "Tab" && !event.shiftKey) || (enterSelects && event.key === "Enter" && !event.shiftKey)) {
    event.preventDefault()
    choose(highlighted)
    return true
  }
  if (event.key === "Escape") {
    event.preventDefault()
    close()
    return true
  }
  return false
}

export function useEntrySuggestions(search, apply, { enterSelects = false, below = false } = {}) {
  const [open, setOpen] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const suggestions = open && search ? search(open.query) : []
  const highlighted = Math.min(activeIndex, Math.max(0, suggestions.length - 1))
  const isOpen = open !== null

  const close = useCallback(() => setOpen(null), [])
  useCloseOnOutsideScroll(isOpen, close)

  const choose = (value) => {
    apply(value)
    close()
  }

  const update = (text, element) => {
    setOpen({ query: text, rect: element.getBoundingClientRect() })
    setActiveIndex(0)
  }

  const handleKeyDown = (event) =>
    handleSuggestionKeys(event, {
      count: suggestions.length,
      highlighted,
      setActiveIndex,
      choose: (index) => choose(suggestions[index].value),
      close,
      enterSelects,
    })

  const menu = (
    <EntrySuggestionMenu
      rect={open?.rect}
      suggestions={suggestions}
      activeIndex={highlighted}
      onHover={setActiveIndex}
      onSelect={choose}
      onDismiss={close}
      below={below}
    />
  )

  return { update, close, handleKeyDown, menu, isOpen: isOpen && suggestions.length > 0 }
}

function getCardPlacement(rect, belowOnly = false) {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const spaceBelow = viewportHeight - rect.bottom - 12
  const spaceAbove = rect.top - 12
  const openUp = !belowOnly && spaceBelow < 220 && spaceAbove > spaceBelow
  const space = openUp ? spaceAbove : spaceBelow
  const width = Math.min(Math.max(rect.width, CARD_MIN_WIDTH), CARD_MAX_WIDTH, viewportWidth - 16)
  const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8))

  return {
    left,
    width,
    top: openUp ? rect.top - 4 : rect.bottom + 4,
    openUp,
    listMaxHeight: Math.max(120, Math.min(CARD_MAX_LIST_HEIGHT, space - CARD_CHROME_HEIGHT)),
  }
}

/**
 * Shared pop-up card for previous entries and saved formulas. With `rect` it floats
 * over the page (so tables never clip it); without, it sits under its parent.
 */
export function SuggestionCard({
  rect = null,
  title,
  items,
  activeIndex,
  onHover,
  onSelect,
  onDismiss,
  footer = "Click an entry or press Tab to use the highlighted one. Esc closes.",
  below = false,
}) {
  const listRef = useRef(null)

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, items.length])

  if (!items.length || typeof document === "undefined") return null

  const placement = rect ? getCardPlacement(rect, below) : null
  const moveBy = (step) => onHover(Math.max(0, Math.min(activeIndex + step, items.length - 1)))

  const card = (
    <div
      data-suggestion-card=""
      onMouseDown={(event) => event.preventDefault()}
      className={`flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 ${
        placement ? "fixed z-[70]" : "absolute left-0 right-0 top-full z-50 mt-1 min-w-[16rem]"
      }`}
      style={
        placement
          ? {
              left: placement.left,
              width: placement.width,
              top: placement.top,
              transform: placement.openUp ? "translateY(-100%)" : undefined,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {title} <span className="font-normal normal-case text-zinc-400">· {items.length}</span>
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous suggestion"
            disabled={activeIndex <= 0}
            onClick={() => moveBy(-1)}
            className="rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Next suggestion"
            disabled={activeIndex >= items.length - 1}
            onClick={() => moveBy(1)}
            className="rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-30"
          >
            ▼
          </button>
          <button
            type="button"
            aria-label="Close suggestions"
            onClick={onDismiss}
            className="ml-1 rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
          >
            X
          </button>
        </div>
      </div>
      <ul
        ref={listRef}
        role="listbox"
        className="overflow-y-auto overscroll-contain py-1"
        style={{ maxHeight: placement ? placement.listMaxHeight : 288 }}
      >
        {items.map((item, index) => (
          <li key={item.key} role="option" aria-selected={index === activeIndex} data-index={index}>
            <button
              type="button"
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item.value)}
              className={`block w-full border-l-2 px-3 py-2 text-left ${
                index === activeIndex
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-transparent text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              <span
                className={`block whitespace-pre-wrap break-words text-sm leading-snug ${
                  item.mono ? "font-mono" : ""
                }`}
              >
                {item.label ?? item.value}
              </span>
              {item.hint ? <span className="mt-0.5 block text-[11px] text-zinc-500">{item.hint}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-zinc-100 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-500">{footer}</p>
    </div>
  )

  return placement ? createPortal(card, document.body) : card
}

export default function EntrySuggestionMenu({ rect, suggestions, activeIndex, onHover, onSelect, onDismiss, below = false }) {
  if (!rect || !suggestions?.length) return null

  return (
    <SuggestionCard
      rect={rect}
      below={below}
      title="Previous entries"
      items={suggestions.map((item) => ({ key: item.value, value: item.value, hint: item.hint }))}
      activeIndex={activeIndex}
      onHover={onHover}
      onSelect={onSelect}
      onDismiss={onDismiss}
    />
  )
}
