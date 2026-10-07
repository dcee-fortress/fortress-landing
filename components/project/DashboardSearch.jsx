"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"

function findMatchingIndexes(rows, query, getSearchText) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  return rows.flatMap((row, index) => {
    const text = getSearchText(row).toLowerCase()
    return words.every((word) => text.includes(word)) ? [index] : []
  })
}

function scrollRowBelowPanel(rowDomId, panelId) {
  requestAnimationFrame(() => {
    const row = document.getElementById(rowDomId)
    if (!row) return
    const panel = document.getElementById(panelId)
    const panelBottom = panel ? parseFloat(getComputedStyle(panel).top) + panel.offsetHeight : 0
    window.scrollTo({
      top: row.getBoundingClientRect().top + window.scrollY - panelBottom - 12,
      behavior: "smooth",
    })
  })
}

/**
 * Search state for a dashboard table. Rows must render with
 * `id={`${rowIdPrefix}-${index}`}` so a match can be scrolled into view.
 */
export function useDashboardSearch({ rows, getSearchText, rowIdPrefix, panelId }) {
  const [state, setState] = useState({ query: "", position: 0 })
  const matchIndexes = findMatchingIndexes(rows, state.query, getSearchText)
  const position = Math.min(state.position, Math.max(matchIndexes.length - 1, 0))

  function scrollToRow(rowIndex) {
    if (rowIndex === undefined) return
    scrollRowBelowPanel(`${rowIdPrefix}-${rowIndex}`, panelId)
  }

  return {
    panelId,
    query: state.query,
    matchIndexes,
    position,
    highlightedIndex: matchIndexes[position] ?? null,
    search(query) {
      setState({ query, position: 0 })
      scrollToRow(findMatchingIndexes(rows, query, getSearchText)[0])
    },
    step(delta) {
      if (matchIndexes.length === 0) return
      const next = (position + delta + matchIndexes.length) % matchIndexes.length
      setState((current) => ({ ...current, position: next }))
      scrollToRow(matchIndexes[next])
    },
    clear() {
      setState({ query: "", position: 0 })
    },
  }
}

/** Sticky: render as a direct child of the container that holds the table. */
export default function DashboardSearch({
  search,
  rows,
  placeholder,
  ariaLabel,
  noMatchLabel,
  getDetails,
  className = "",
}) {
  const [query, setQuery] = useState(search.query)
  const currentRow = search.highlightedIndex === null ? null : rows[search.highlightedIndex]
  const matchCount = search.matchIndexes.length
  const hasSearched = search.query.trim() !== ""
  const details = currentRow ? getDetails(currentRow) : []

  function handleSubmit(event) {
    event.preventDefault()
    search.search(query)
  }

  function handleClear() {
    setQuery("")
    search.clear()
  }

  return (
    <div
      id={search.panelId}
      className={`no-print sticky top-[calc(65px+env(safe-area-inset-top))] z-10 -mx-2 mb-4 space-y-3 bg-white px-2 py-2 ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            <Icon name="search" size={16} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Icon name="search" size={16} />
          Search
        </button>
        {hasSearched ? (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <Icon name="x" size={16} />
            Clear
          </button>
        ) : null}
      </form>

      {hasSearched && matchCount === 0 ? (
        <p className="text-sm text-zinc-500">
          {noMatchLabel} “{search.query}”.
        </p>
      ) : null}

      {currentRow ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Match {search.position + 1} of {matchCount}
            </p>
            {matchCount > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => search.step(-1)}
                  aria-label="Previous match"
                  className="rounded-md border border-amber-300 bg-white p-1 text-amber-800 transition hover:bg-amber-100"
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => search.step(1)}
                  aria-label="Next match"
                  className="rounded-md border border-amber-300 bg-white p-1 text-amber-800 transition hover:bg-amber-100"
                >
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            ) : null}
          </div>
          <p className="mt-1 font-semibold text-zinc-900">{currentRow.description}</p>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {details.map((detail) => (
              <div key={detail.label}>
                <dt className="text-xs text-zinc-500">{detail.label}</dt>
                <dd className="font-semibold tabular-nums text-zinc-900">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
