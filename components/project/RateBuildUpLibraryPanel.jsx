"use client"

import { useEffect, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import {
  buildRateBuildUpRowsForBoq,
  isGrandTotalRow,
  isPlantSubRow,
  RATE_BUILD_UP_COLUMNS,
  resolveActualCostAnalysisRow,
  resolveGrandTotalRow,
} from "@/lib/actualCostAnalysis"
import { listAllSavedBoqs } from "@/lib/boqData"
import {
  captureRateBuildUpGroup,
  writeClipboardPayload,
} from "@/lib/rateBuildUpClipboard"
import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
  formatMaterialRate,
} from "@/lib/plantCostCalculations"

function computedDisplay(row, key) {
  if (
    key === "fuelCost" ||
    key === "plantCost" ||
    key === "totalCost" ||
    key === "laborCost" ||
    key === "materialCost"
  ) {
    const value =
      row[key] ??
      (key === "laborCost" ? row.resolvedLaborCost : null) ??
      (key === "materialCost" ? row.resolvedMaterialCost : null)
    if (value === null || value === undefined) return "—"
    return formatMaterialCurrencyAmount(value)
  }
  if (key === "rate" || key === "billRate" || key === "allowableRate") {
    return formatMaterialRate(row[key])
  }
  return "—"
}

function formatCell(row, resolved, column) {
  if (column.key === "activityDescription") {
    return String(row.activityDescription ?? "").trim() || "—"
  }
  if (column.percent) {
    const text = String(row[column.key] ?? "").trim().replace("%", "")
    return text ? `${text}%` : "—"
  }
  if (column.computed || column.key === "materialCost" || column.key === "laborCost") {
    return computedDisplay(resolved, column.key)
  }
  if (column.numeric) {
    const raw = String(row[column.key] ?? "").trim()
    if (!raw) return "—"
    if (column.key === "production" || column.key === "fuelAllocated" || column.key === "materialQty") {
      return formatMaterialAmount(raw) || raw
    }
    return formatMaterialCurrencyAmount(raw) || raw
  }
  const text = String(row[column.key] ?? "").trim()
  return text || "—"
}

function groupCostRows(rows, parentId) {
  return rows.filter(
    (row) => row.id === parentId || (isPlantSubRow(row) && row.parentId === parentId)
  )
}

export default function RateBuildUpLibraryPanel({
  projectId,
  open,
  onClose,
  onCopied,
}) {
  const [boqs, setBoqs] = useState([])
  const [selectedKey, setSelectedKey] = useState("")
  const [status, setStatus] = useState("")
  const [selectedRowIndex, setSelectedRowIndex] = useState(null)

  useEffect(() => {
    if (!open) return
    setStatus("")
    setSelectedRowIndex(null)
    const list = listAllSavedBoqs()
    setBoqs(list)
    const preferred =
      list.find((item) => item.projectId === projectId) ?? list[0] ?? null
    setSelectedKey(preferred ? `${preferred.projectId}::${preferred.boqId}` : "")
  }, [open, projectId])

  const selectedBoq = useMemo(
    () => boqs.find((item) => `${item.projectId}::${item.boqId}` === selectedKey) ?? null,
    [boqs, selectedKey]
  )

  const previewRows = useMemo(() => {
    if (!selectedBoq) return []
    return buildRateBuildUpRowsForBoq(selectedBoq.projectId, selectedBoq.boqId)
  }, [selectedBoq])

  const resolvedRows = useMemo(() => {
    return previewRows.map((row) => {
      if (isGrandTotalRow(row)) {
        return resolveGrandTotalRow(row, groupCostRows(previewRows, row.parentId))
      }
      return resolveActualCostAnalysisRow(row)
    })
  }, [previewRows])

  if (!open) return null

  const handleCopyRow = async (rowIndex) => {
    const payload = captureRateBuildUpGroup(previewRows, rowIndex)
    if (!payload) {
      setStatus("Select a main or plant row to copy (not Grand total).")
      return
    }
    await writeClipboardPayload(payload)
    setSelectedRowIndex(rowIndex)
    setStatus("Copied — close this panel, right-click a row in your template → Replace row")
    onCopied?.(payload)
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-stretch justify-center bg-zinc-950/45 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Copy rate build-up from BOQ"
    >
      <div className="flex h-full w-full max-w-[96rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Copy / paste library
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {selectedBoq ? selectedBoq.displayName : "Choose a BOQ file"}
            </h2>
            <p className="max-w-3xl text-sm text-zinc-500">
              Pick an uploaded BOQ, view its Rate build-up table, copy a row, then replace a row in your
              current template.
            </p>
            {status ? <p className="text-xs font-medium text-emerald-700">{status}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedBoq && selectedRowIndex != null ? (
              <button
                type="button"
                onClick={() => handleCopyRow(selectedRowIndex)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Icon name="clipboard-list" size={15} />
                Copy selected
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <Icon name="x" size={15} />
              Close
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="max-h-48 shrink-0 overflow-auto border-b border-zinc-200 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
            <p className="sticky top-0 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Saved BOQ files
            </p>
            {boqs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">No BOQs uploaded yet.</p>
            ) : (
              <ul>
                {boqs.map((boq) => {
                  const key = `${boq.projectId}::${boq.boqId}`
                  const active = key === selectedKey
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedKey(key)
                          setSelectedRowIndex(null)
                          setStatus("")
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition ${
                          active ? "bg-zinc-100" : "hover:bg-zinc-50"
                        }`}
                      >
                        <p className="break-words font-medium text-zinc-900">{boq.displayName}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {boq.itemCount} item{boq.itemCount === 1 ? "" : "s"}
                          {boq.projectId === projectId ? " · this project" : ""}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-4">
            {!selectedBoq ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
                Select a BOQ file to view its Rate build-up.
              </div>
            ) : previewRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
                This BOQ has no line items.
              </div>
            ) : (
              <table className="w-full min-w-[2100px] border-collapse text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                    {RATE_BUILD_UP_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={`sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-semibold ${
                          column.align === "left" ? "text-left" : "text-right"
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="sticky top-0 z-20 w-24 bg-zinc-900 px-3 py-3 text-right font-semibold">
                      Copy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => {
                    const resolved = resolvedRows[rowIndex]
                    const plantSub = isPlantSubRow(row)
                    const grand = isGrandTotalRow(row)
                    const selected = selectedRowIndex === rowIndex
                    return (
                      <tr
                        key={`${row.id}-${rowIndex}`}
                        onClick={() => {
                          if (!grand) setSelectedRowIndex(rowIndex)
                        }}
                        className={`border-b border-zinc-200 align-top ${
                          selected
                            ? "bg-sky-50"
                            : grand
                              ? "bg-amber-50/70"
                              : plantSub
                                ? "bg-zinc-50/80"
                                : "bg-white"
                        } ${grand ? "" : "cursor-pointer"}`}
                      >
                        {RATE_BUILD_UP_COLUMNS.map((column) => (
                          <td
                            key={column.key}
                            className={`px-3 py-3 ${
                              column.key === "activityDescription"
                                ? "min-w-[20rem] max-w-[36rem]"
                                : column.key === "plantName"
                                  ? "min-w-[12rem] max-w-[16rem]"
                                  : ""
                            } ${column.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                          >
                            <div
                              className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug ${
                                column.key === "billRate"
                                  ? "text-base font-bold text-zinc-950"
                                  : grand &&
                                (column.key === "activityDescription" ||
                                  column.key === "totalCost" ||
                                  column.key === "plantCost" ||
                                  column.key === "laborCost" ||
                                  column.key === "materialCost")
                                  ? "font-semibold text-zinc-900"
                                  : "text-zinc-900"
                              }`}
                            >
                              {column.key === "activityDescription" && plantSub
                                ? "└ plant"
                                : formatCell(row, resolved, column)}
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right align-top">
                          {grand ? null : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleCopyRow(rowIndex)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              <Icon name="clipboard-list" size={13} />
                              Copy
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
