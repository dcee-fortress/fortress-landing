"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"
import { formatBoqRate, parseBoqRateInput } from "@/lib/boqData"

function draftFromBoq(boq) {
  return (boq?.items ?? []).map((item) => ({
    id: item.id,
    itemName: item.itemName ?? "",
    rate: item.rate ?? "",
  }))
}

function boqDraftKey(boq) {
  return `${boq.id}-${(boq.items ?? [])
    .map((item) => `${item.id}:${item.itemName}:${item.rate}`)
    .join("|")}`
}

function BoqViewerModalContent({ boq, editable = true, onClose, onSave, onViewPdf }) {
  const [draftItems, setDraftItems] = useState(() => draftFromBoq(boq))
  const [saveError, setSaveError] = useState("")

  const updateItem = (itemId, field, value) => {
    setDraftItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    )
    setSaveError("")
  }

  const handleSave = () => {
    const normalized = draftItems
      .map((item) => ({
        id: item.id,
        itemName: item.itemName.trim(),
        rate: parseBoqRateInput(item.rate),
      }))
      .filter((item) => item.itemName && item.rate !== null)

    if (normalized.length === 0) {
      setSaveError("Add at least one row with a description and rate.")
      return
    }

    onSave?.(normalized)
    setSaveError("")
  }

  const hasChanges =
    JSON.stringify(draftItems) !==
    JSON.stringify(
      (boq.items ?? []).map((item) => ({
        id: item.id,
        itemName: item.itemName ?? "",
        rate: item.rate ?? "",
      }))
    )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boq-viewer-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div className="min-w-0">
            <h2 id="boq-viewer-title" className="text-xl font-semibold text-zinc-900">
              {boq.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {editable
                ? "Edit descriptions and unit rates. Changes update rate analysis comparisons."
                : null}
              {boq.fileName ? `${editable ? " " : ""}${boq.fileName} · ` : ""}
              {draftItems.length} item{draftItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close BOQ viewer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 transition hover:bg-zinc-100"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="overflow-auto px-6 py-4">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50">
                <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                  Description
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  BOQ rate
                </th>
              </tr>
            </thead>
            <tbody>
              {draftItems.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="border border-zinc-200 px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(event) => updateItem(item.id, "itemName", event.target.value)}
                        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="px-1 text-zinc-900">{item.itemName}</span>
                    )}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.rate}
                        onChange={(event) => updateItem(item.id, "rate", event.target.value)}
                        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="block px-1 text-right tabular-nums text-zinc-900">
                        {formatBoqRate(item.rate)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3">
          {saveError ? <p className="mb-2 text-sm text-red-600">{saveError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-600">
              BOQ rates are stored in this browser and used as the reference for rate analysis.
              Decimal rates are preserved (e.g. $12.50).
            </p>
            {editable && onSave ? (
              <div className="flex shrink-0 gap-2">
                {onViewPdf ? (
                  <button
                    type="button"
                    onClick={() => onViewPdf(boq)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Icon name="file-down" size={15} />
                    View BOQ PDF
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save changes
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 gap-2">
                {onViewPdf ? (
                  <button
                    type="button"
                    onClick={() => onViewPdf(boq)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Icon name="file-down" size={15} />
                    View BOQ PDF
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BoqViewerModal({ boq, editable = true, onClose, onSave, onViewPdf }) {
  if (!boq) return null

  return (
    <BoqViewerModalContent
      key={boqDraftKey(boq)}
      boq={boq}
      editable={editable}
      onClose={onClose}
      onSave={onSave}
      onViewPdf={onViewPdf}
    />
  )
}
