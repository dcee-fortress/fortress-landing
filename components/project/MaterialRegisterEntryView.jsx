"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import FormulaAmountInput from "@/components/project/FormulaAmountInput"
import MemoryTextInput from "@/components/project/MemoryTextInput"
import { useProjects } from "@/components/project/ProjectsProvider"
import { buildCellHistory, searchCellHistory } from "@/lib/cellHistory"
import { formatMaterialUnitPriceAmount } from "@/lib/plantCostCalculations"
import { getMaterialRegister } from "@/lib/materialRegister"
import { getMaterialRegisterDailyFileHref } from "@/lib/projectRoutes"

export default function MaterialRegisterEntryView({ projectId, projectName, dayId, kind }) {
  const register = getMaterialRegister(kind)
  const file = register.getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const [rows, setRows] = useState([])
  const [saveState, setSaveState] = useState("saved")
  const saveTimerRef = useRef(0)
  const rowsRef = useRef([])
  const { version } = useProjects()

  const memoryKeys = register.entryColumns
    .filter((column) => column.kind === "text" || column.kind === "number" || column.kind === "money")
    .map((column) => column.key)

  const history = useMemo(() => {
    void version
    return buildCellHistory(
      [...register.getHistoryRows(projectId, dayId), ...rows],
      memoryKeys
    )
  }, [dayId, memoryKeys, projectId, register, rows, version])

  const loadRows = useCallback(() => {
    setRows(register.getRows(projectId, dayId))
  }, [dayId, projectId, register])

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
        await register.saveRows(projectId, dayId, nextRows)
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [dayId, projectId, register]
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
      void register.saveRows(projectId, dayId, rowsRef.current)
    }
    window.addEventListener("pagehide", flush)
    return () => {
      window.clearTimeout(saveTimerRef.current)
      window.removeEventListener("pagehide", flush)
    }
  }, [dayId, projectId, register])

  function commitRows(updater, { immediate = false } = {}) {
    setRows((current) => {
      const draft = typeof updater === "function" ? updater(current) : updater
      const next = draft.map((row) => register.prepareRow(row, dayId))
      if (immediate) void persist(next)
      else schedulePersist(next)
      return next
    })
    setSaveState(immediate ? "saving" : "pending")
  }

  function updateRow(rowId, patch) {
    commitRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const dayQuantity = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  const dayTotal = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialRegisterDailyFileHref(projectId, kind, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily dashboard
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{register.entryTitle}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {dayLabel}
          {kind === "request"
            ? " · Total cost = quantity of material requested × unit price."
            : " · Delivery note and supplier stay on this entry. Date, description, and quantity received roll to the daily dashboard and project to date."}
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{register.entryTitle} table</h2>
            <p className="text-sm text-zinc-500">
              {kind === "request"
                ? `Day total ${formatMaterialUnitPriceAmount(dayTotal)}`
                : `Quantity received ${dayQuantity}`}
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
                {register.entryColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`border-b border-zinc-200 px-3 py-3 ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  {register.entryColumns.map((column) => (
                    <td key={column.key} className="px-3 py-2 align-top">
                      {column.kind === "computed" ? (
                        <p className="px-2 py-2 text-right tabular-nums font-medium text-zinc-900">
                          {formatMaterialUnitPriceAmount(row.totalCost)}
                        </p>
                      ) : column.kind === "date" ? (
                        <input
                          type="date"
                          value={row.date || dayId}
                          aria-label={column.label}
                          onChange={(event) => updateRow(row.id, { date: event.target.value })}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-zinc-500"
                        />
                      ) : column.kind === "number" || column.kind === "money" ? (
                        <FormulaAmountInput
                          value={row[column.key]}
                          formula={row[`${column.key}Formula`] || ""}
                          ariaLabel={column.label}
                          onChange={(value, formula) =>
                            updateRow(row.id, {
                              [column.key]: value,
                              [`${column.key}Formula`]: formula || "",
                            })
                          }
                        />
                      ) : (
                        <MemoryTextInput
                          value={row[column.key]}
                          aria-label={column.label}
                          placeholder={column.label}
                          suggest={(query) =>
                            searchCellHistory(history, column.key, {
                              query,
                              description: column.key === "description" ? "" : row.description,
                            })
                          }
                          onChange={(value) => updateRow(row.id, { [column.key]: value })}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-zinc-500"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      aria-label="Delete row"
                      onClick={() =>
                        commitRows(
                          (current) => {
                            const next = current.filter((item) => item.id !== row.id)
                            return next.length > 0 ? next : [register.createRow(dayId)]
                          },
                          { immediate: true }
                        )
                      }
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() =>
              commitRows((current) => [...current, register.createRow(dayId)], { immediate: true })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            <Icon name="plus" size={16} />
            Add row
          </button>
        </div>
      </section>
    </div>
  )
}
