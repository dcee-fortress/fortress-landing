"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"
import { formatBoqRate, parseBoqRateInput } from "@/lib/boqData"

function draftCost(item) {
  if (item?.cost !== null && item?.cost !== undefined && String(item.cost).trim() !== "") {
    return item.cost
  }
  const rate = Number(item?.billRate ?? item?.rate)
  const quantity = Number(item?.quantity)
  if (!Number.isFinite(rate) || !Number.isFinite(quantity)) return ""
  return Math.round(rate * quantity * 10000) / 10000
}

function draftFromBoq(boq) {
  return (boq?.items ?? []).map((item) => ({
    id: item.id,
    itemName: item.itemName ?? "",
    unit: item.unit ?? "",
    itemNo: item.itemNo ?? "",
    quantity: item.quantity ?? "",
    allowableRate: item.allowableRate ?? "",
    billRate: item.billRate ?? item.rate ?? "",
    rate: item.billRate ?? item.rate ?? "",
    cost: draftCost(item),
  }))
}

function boqDraftKey(boq) {
  return `${boq.id}-${(boq.items ?? [])
    .map((item) => `${item.id}:${item.itemName}:${item.unit ?? ""}:${item.quantity ?? ""}:${item.allowableRate ?? ""}:${item.billRate ?? item.rate}:${item.cost ?? ""}`)
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
      .map((item) => {
        const quantity = parseBoqRateInput(item.quantity)
        const billRate = parseBoqRateInput(item.billRate)
        const allowableRate = parseBoqRateInput(item.allowableRate)
        const rate = billRate ?? allowableRate
        const cost =
          rate !== null && quantity !== null
            ? Math.round(rate * quantity * 10000) / 10000
            : parseBoqRateInput(item.cost)
        return {
          id: item.id,
          itemName: item.itemName.trim(),
          unit: String(item.unit ?? "").trim(),
          itemNo: String(item.itemNo ?? "").trim(),
          quantity,
          allowableRate,
          billRate,
          rate,
          cost,
        }
      })
      .filter((item) => /[A-Za-z]{3,}/.test(item.itemName))

    if (normalized.length === 0) {
      setSaveError("Add at least one row with a description.")
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
        unit: item.unit ?? "",
        itemNo: item.itemNo ?? "",
        quantity: item.quantity ?? "",
        allowableRate: item.allowableRate ?? "",
        billRate: item.billRate ?? item.rate ?? "",
        rate: item.billRate ?? item.rate ?? "",
        cost: draftCost(item),
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
                <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                  Unit
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  Quantity
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  Allowable rate
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  Bill rate
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  Cost
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
                        value={item.unit ?? ""}
                        onChange={(event) => updateItem(item.id, "unit", event.target.value)}
                        className="w-24 rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="px-1 text-zinc-900">{item.unit || "—"}</span>
                    )}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity ?? ""}
                        onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                        className="w-24 rounded border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="block px-1 text-right tabular-nums text-zinc-900">
                        {item.quantity === "" || item.quantity == null ? "—" : item.quantity}
                      </span>
                    )}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.allowableRate ?? ""}
                        onChange={(event) => updateItem(item.id, "allowableRate", event.target.value)}
                        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="block px-1 text-right tabular-nums text-zinc-900">
                        {formatBoqRate(item.allowableRate)}
                      </span>
                    )}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.billRate ?? ""}
                        onChange={(event) => updateItem(item.id, "billRate", event.target.value)}
                        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-zinc-900 outline-none ring-emerald-600/20 focus:border-emerald-400 focus:ring-2"
                      />
                    ) : (
                      <span className="block px-1 text-right tabular-nums text-zinc-900">
                        {formatBoqRate(item.billRate ?? item.rate)}
                      </span>
                    )}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5">
                    <span className="block px-1 text-right tabular-nums text-zinc-900">
                      {(() => {
                        const liveCost = draftCost(item)
                        return liveCost === "" || liveCost == null ? "—" : formatBoqRate(liveCost)
                      })()}
                    </span>
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
              Rates and Cost (rate × quantity) fill from Rate build up when those rates exist.
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
