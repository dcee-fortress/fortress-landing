"use client"

import { useMemo, useRef, useState } from "react"
import { getAllBoqItemNames } from "@/lib/boqData"
import { searchDescriptionSuggestions } from "@/lib/boqDescriptionMemory"
import { getActivityDescriptionsForSlot } from "@/lib/materialSchedule"

export default function ActivityDescriptionInput({
  projectId,
  dayId,
  slotId,
  value,
  onChange,
  refreshKey = 0,
}) {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const extraDescriptions = useMemo(() => {
    void refreshKey

    const fromBoq = getAllBoqItemNames(projectId)
    const fromSlot = getActivityDescriptionsForSlot(projectId, dayId, slotId)
    return [...fromBoq, ...fromSlot]
  }, [projectId, dayId, slotId, refreshKey])

  const suggestions = useMemo(
    () =>
      searchDescriptionSuggestions(projectId, value, {
        extraDescriptions,
        limit: 8,
      }),
    [projectId, value, extraDescriptions]
  )

  const highlightedIndex = Math.min(
    activeIndex,
    Math.max(0, suggestions.length - 1)
  )

  const showSuggestions = isOpen && suggestions.length > 0

  const selectSuggestion = (text) => {
    onChange(text)
    setActiveIndex(0)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative min-w-[12rem] max-w-[20rem]">
      <textarea
        rows={2}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setActiveIndex(0)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120)
        }}
        onKeyDown={(event) => {
          if (showSuggestions) {
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

            if (event.key === "Enter" && !event.shiftKey && suggestions[highlightedIndex]) {
              event.preventDefault()
              selectSuggestion(suggestions[highlightedIndex])
              return
            }
          }

          if (event.key === "Escape") {
            setIsOpen(false)
          }
        }}
        placeholder="Type activity — BOQ matches suggested"
        className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm leading-snug text-zinc-900 break-words whitespace-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        autoComplete="off"
        aria-autocomplete="list"
      />

      {showSuggestions ? (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full min-w-[16rem] overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className={`block w-full px-3 py-2 text-left text-sm leading-snug break-words whitespace-normal transition ${
                  index === highlightedIndex
                    ? "bg-blue-50 text-blue-900"
                    : "text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
