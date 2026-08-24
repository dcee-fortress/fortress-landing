"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { filterReportFiles } from "@/lib/reportFileSearch"

export function useReportFileSearch(files) {
  const [query, setQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")

  const filteredFiles = useMemo(
    () => filterReportFiles(files, activeQuery),
    [files, activeQuery]
  )

  const runSearch = () => {
    setActiveQuery(query.trim())
  }

  const clearSearch = () => {
    setQuery("")
    setActiveQuery("")
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      runSearch()
    }
  }

  const singleMatch = activeQuery && filteredFiles.length === 1 ? filteredFiles[0] : null

  return {
    query,
    setQuery,
    runSearch,
    clearSearch,
    activeQuery,
    filteredFiles,
    singleMatch,
    handleKeyDown,
  }
}

export default function ReportFileSearchBar({
  query,
  setQuery,
  runSearch,
  clearSearch,
  activeQuery,
  filteredFiles,
  singleMatch,
  handleKeyDown,
  getFileHref,
  projectId,
  placeholder = "Search by date, label, or file id…",
}) {
  return (
    <div className="border-b border-zinc-200 bg-white px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search files"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={runSearch}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="search" size={16} />
            Search
          </button>
          {activeQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {activeQuery ? (
        <p className="mt-3 text-sm text-zinc-500">
          {filteredFiles.length === 0
            ? `No files match "${activeQuery}".`
            : `${filteredFiles.length} file${filteredFiles.length === 1 ? "" : "s"} found for "${activeQuery}".`}
        </p>
      ) : null}

      {singleMatch ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-900">Match found</p>
            <p className="truncate text-sm text-emerald-800">{singleMatch.label}</p>
          </div>
          <Link
            href={getFileHref(projectId, singleMatch.id)}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Open dashboard
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
