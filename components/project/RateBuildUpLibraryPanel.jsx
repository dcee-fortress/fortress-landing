"use client"

import { useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import {
  listRateBuildUpLibrary,
  writeClipboardPayload,
} from "@/lib/rateBuildUpClipboard"
import { formatMaterialCurrencyAmount, formatMaterialAmount } from "@/lib/plantCostCalculations"
import { resolveActualCostAnalysisRow } from "@/lib/actualCostAnalysis"

function previewLines(payload) {
  if (!payload?.main) return []
  const resolved = resolveActualCostAnalysisRow(payload.main)
  const lines = []
  if (payload.main.plantName) lines.push(`Plant: ${payload.main.plantName}`)
  if (payload.plants?.length) lines.push(`${payload.plants.length} plant sub-row(s)`)
  if (resolved.plantCost != null) lines.push(`Plant cost ${formatMaterialCurrencyAmount(resolved.plantCost)}`)
  if (resolved.laborCost != null || resolved.resolvedLaborCost != null) {
    lines.push(
      `Labour ${formatMaterialCurrencyAmount(resolved.laborCost ?? resolved.resolvedLaborCost)}`
    )
  }
  if (resolved.materialCost != null) {
    lines.push(`Material ${formatMaterialCurrencyAmount(resolved.materialCost)}`)
  }
  if (resolved.totalCost != null) lines.push(`Total ${formatMaterialCurrencyAmount(resolved.totalCost)}`)
  if (payload.main.production || payload.grand?.production) {
    lines.push(
      `Production ${formatMaterialAmount(payload.grand?.production || payload.main.production)}`
    )
  }
  return lines
}

export default function RateBuildUpLibraryPanel({ rows, open, onClose, onCopied }) {
  const [selectedId, setSelectedId] = useState("")
  const [status, setStatus] = useState("")

  const library = useMemo(() => listRateBuildUpLibrary(rows), [rows])
  const selected = library.find((item) => item.id === selectedId) ?? library[0] ?? null

  if (!open) return null

  const handleCopy = async () => {
    if (!selected?.payload) return
    await writeClipboardPayload(selected.payload)
    setStatus("Copied — paste onto a row or right-click → Replace row")
    onCopied?.(selected.payload)
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/40 p-3" role="dialog">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Build-up library</p>
            <h2 className="text-lg font-semibold text-zinc-900">Copy a rate build-up</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Icon name="x" size={14} />
            Close
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          <ul className="min-h-0 overflow-auto border-b border-zinc-200 md:border-b-0 md:border-r">
            {library.length === 0 ? (
              <li className="px-4 py-8 text-sm text-zinc-500">No saved build-ups yet. Fill a row first.</li>
            ) : (
              library.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id)
                      setStatus("")
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition ${
                      selected?.id === item.id ? "bg-zinc-100" : "hover:bg-zinc-50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words font-medium text-zinc-900">
                      {item.description || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.source === "memory" ? "From memory" : "This sheet"}
                      {item.plantCount ? ` · ${item.plantCount} plant row(s)` : ""}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="min-h-0 overflow-auto px-4 py-3">
            {selected ? (
              <>
                <p className="whitespace-pre-wrap break-words text-sm font-semibold text-zinc-900">
                  {selected.description}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                  {previewLines(selected.payload).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    <Icon name="clipboard-list" size={15} />
                    Copy (Ctrl+C)
                  </button>
                </div>
                {status ? <p className="mt-2 text-xs text-emerald-700">{status}</p> : null}
                <p className="mt-3 text-xs text-zinc-500">
                  After copying, right-click a row in Rate build up and choose Replace row — plant sub-rows
                  come with it.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Select a build-up to preview.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
