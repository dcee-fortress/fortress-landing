"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import {
  PPE_ISSUED_COLUMNS,
  createPpeIssuedRow,
  formatPpeIssuedDateLabel,
  getPpeIssuedRows,
  withPpeIssuedTotals,
  savePpeIssuedRows,
} from "@/lib/ppeIssued"
import {
  formatMaterialCurrencyAmount,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import { getPpeIssuedDailyFileHref } from "@/lib/projectRoutes"
import { getDailyFile } from "@/lib/projectFiles"

function formatInputAmount(value) {
  if (value === "" || value === null || value === undefined) return ""
  const parsed = parsePlantCostAmount(value)
  if (parsed === null) return String(value)
  return String(parsed)
}

export default function PpeIssuedEntryView({ projectId, projectName, dayId }) {
  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const dateLabel = formatPpeIssuedDateLabel(dayId)
  const [rows, setRows] = useState([])
  const [saveState, setSaveState] = useState("saved")
  const saveTimerRef = useRef(0)
  const rowsRef = useRef([])

  const loadRows = useCallback(() => {
    setRows(getPpeIssuedRows(projectId, dayId))
  }, [dayId, projectId])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const persist = useCallback(
    async (nextRows) => {
      setSaveState("saving")
      try {
        await savePpeIssuedRows(projectId, dayId, nextRows)
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [dayId, projectId]
  )

  const schedulePersist = useCallback(
    (nextRows) => {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(() => {
        void persist(nextRows)
      }, 450)
    },
    [persist]
  )

  useEffect(() => {
    const flush = () => {
      window.clearTimeout(saveTimerRef.current)
      void savePpeIssuedRows(projectId, dayId, rowsRef.current)
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush()
    })
    return () => {
      window.clearTimeout(saveTimerRef.current)
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
    }
  }, [dayId, projectId])

  function commitRows(updater, { immediate = false } = {}) {
    setRows((current) => {
      const draft = typeof updater === "function" ? updater(current) : updater
      const next = withPpeIssuedTotals(draft)
      if (immediate) {
        void persist(next)
      } else {
        schedulePersist(next)
      }
      return next
    })
    setSaveState(immediate ? "saving" : "pending")
  }

  function updateRow(rowId, key, value) {
    commitRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    )
  }

  function addRow() {
    commitRows((current) => [...current, createPpeIssuedRow()], { immediate: true })
  }

  function deleteRow(rowId) {
    commitRows((current) => {
      const next = current.filter((row) => row.id !== rowId)
      return next.length > 0 ? next : [createPpeIssuedRow()]
    }, { immediate: true })
  }

  const dayTotal = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPpeIssuedDailyFileHref(projectId, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily dashboard
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          PPE issued entry
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {dayLabel} · Date is set automatically for this day. Total cost = quantities × unit
          price.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">PPE issued entry table</h2>
            <p className="text-sm text-zinc-500">
              Day total {formatMaterialCurrencyAmount(dayTotal)}
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "pending"
                ? "Editing…"
                : saveState === "error"
                  ? "Save failed"
                  : "Saved"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {PPE_ISSUED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`border-b border-zinc-200 px-3 py-3 ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-3 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-zinc-700">
                    {dateLabel}
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      rows={2}
                      value={row.description}
                      onChange={(event) =>
                        updateRow(row.id, "description", event.target.value)
                      }
                      placeholder="Description / name of PPE issued"
                      className="w-full min-w-[14rem] rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.supplier}
                      onChange={(event) => updateRow(row.id, "supplier", event.target.value)}
                      placeholder="Supplier"
                      className="w-full min-w-[10rem] rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatInputAmount(row.quantity)}
                      onChange={(event) => updateRow(row.id, "quantity", event.target.value)}
                      placeholder="0"
                      className="w-full min-w-[6rem] rounded-md border border-zinc-200 px-2 py-1.5 text-right text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatInputAmount(row.unitPrice)}
                      onChange={(event) => updateRow(row.id, "unitPrice", event.target.value)}
                      placeholder="0"
                      className="w-full min-w-[7rem] rounded-md border border-zinc-200 px-2 py-1.5 text-right text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-900">
                    {formatMaterialCurrencyAmount(row.totalCost)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      aria-label="Delete row"
                      onClick={() => deleteRow(row.id)}
                      className="inline-flex rounded-md p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-semibold text-zinc-900">
                <td className="px-3 py-3" colSpan={5}>
                  Day total cost
                </td>
                <td className="px-3 py-3 text-right">
                  {formatMaterialCurrencyAmount(dayTotal)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            <Icon name="plus" size={16} />
            Add row
          </button>
          <p className="text-xs text-zinc-500">
            Entries save as you type. Total cost updates automatically.
          </p>
        </div>
      </section>
    </div>
  )
}
