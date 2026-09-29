"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"

export function useEntrySuggestions(search, apply) {
  const [open, setOpen] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const suggestions = open && search ? search(open.query) : []
  const highlighted = Math.min(activeIndex, Math.max(0, suggestions.length - 1))
  const isOpen = open !== null

  const close = useCallback(() => setOpen(null), [])

  useEffect(() => {
    if (!isOpen) return undefined
    const onScroll = (event) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      close()
    }
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", close)
    }
  }, [isOpen, close])

  const choose = (value) => {
    apply(value)
    close()
  }

  const update = (text, element) => {
    setOpen({ query: text, rect: element.getBoundingClientRect() })
    setActiveIndex(0)
  }

  const handleKeyDown = (event) => {
    if (suggestions.length === 0) return false

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex(Math.min(highlighted + 1, suggestions.length - 1))
      return true
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(Math.max(highlighted - 1, 0))
      return true
    }
    if (event.key === "Tab") {
      event.preventDefault()
      choose(suggestions[highlighted].value)
      return true
    }
    if (event.key === "Escape") {
      event.preventDefault()
      close()
      return true
    }
    return false
  }

  const menu = (
    <EntrySuggestionMenu
      rect={open?.rect}
      suggestions={suggestions}
      activeIndex={highlighted}
      onHover={setActiveIndex}
      onSelect={choose}
      onDismiss={close}
    />
  )

  return { update, close, handleKeyDown, menu }
}

export default function EntrySuggestionMenu({
  rect,
  suggestions,
  activeIndex,
  onHover,
  onSelect,
  onDismiss,
}) {
  if (!rect || !suggestions?.length || typeof document === "undefined") return null

  const openUp = window.innerHeight - rect.bottom < 260 && rect.top > 260

  return createPortal(
    <div
      className="fixed z-[70] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
      style={{
        left: rect.left,
        width: Math.max(rect.width, 224),
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        transform: openUp ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Previous entries
        </p>
        <button
          type="button"
          aria-label="Close suggestions"
          onMouseDown={(event) => {
            event.preventDefault()
            onDismiss()
          }}
          className="rounded px-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        >
          X
        </button>
      </div>
      <ul className="max-h-48 overflow-auto py-1" role="listbox">
        {suggestions.map((item, index) => (
          <li key={item.value} role="option" aria-selected={index === activeIndex}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item.value)}
              className={`block w-full px-3 py-2 text-left ${
                index === activeIndex ? "bg-blue-50 text-blue-900" : "text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              <span className="block whitespace-pre-wrap break-words text-sm">{item.value}</span>
              {item.hint ? (
                <span className="mt-0.5 block text-[11px] text-zinc-500">{item.hint}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-500">
        Tab to use the highlighted entry, Esc to close, or keep typing.
      </p>
    </div>,
    document.body
  )
}
