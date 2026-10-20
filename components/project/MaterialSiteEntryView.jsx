"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import FormulaAmountInput from "@/components/project/FormulaAmountInput"
import TableExportButtons from "@/components/project/TableExportButtons"
import MemoryTextInput from "@/components/project/MemoryTextInput"
import { useProjects } from "@/components/project/ProjectsProvider"
import { buildCellHistory, searchCellHistory } from "@/lib/cellHistory"
import { formatMaterialAmount, parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import {
  getMaterialSiteDailyFile,
  getMaterialSiteEntryRows,
  saveMaterialSiteRows,
} from "@/lib/materialSiteStock"
import { descriptionsMatch } from "@/lib/similarDescriptions"
import { getMaterialSiteDailyFileHref } from "@/lib/projectRoutes"

function blankRow() {
  return {
    id: `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    broughtOnSite: "",
    broughtOnSiteFormula: "",
    materialUsed: "",
    materialUsedFormula: "",
    fromReceived: false,
  }
}

function leftFor(row) {
  const brought = parsePlantCostAmount(row.broughtOnSite) ?? 0
  const used = parsePlantCostAmount(row.materialUsed) ?? 0
  return roundMaterialAmount(brought - used) ?? 0
}

export default function MaterialSiteEntryView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  const file = getMaterialSiteDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const [rows, setRows] = useState([])
  const [saveState, setSaveState] = useState("saved")
  const saveTimerRef = useRef(0)
  const rowsRef = useRef([])
  const loadedDayRef = useRef("")

  const loaded = useMemo(() => {
    void version
    return getMaterialSiteEntryRows(projectId, dayId)
  }, [dayId, projectId, version])

  useEffect(() => {
    setRows((current) => {
      const blank =
        current.length === 0 ||
        current.every(
          (row) =>
            !String(row.description || "").trim() &&
            !String(row.broughtOnSite || "").trim() &&
            !String(row.materialUsed || "").trim()
        )
      if (loadedDayRef.current !== dayId || blank) {
        loadedDayRef.current = dayId
        return loaded
      }
      const extras = loaded.filter(
        (row) =>
          String(row.description || "").trim() &&
          !current.some(
            (item) => item.id === row.id || descriptionsMatch(item.description, row.description)
          )
      )
      return extras.length > 0 ? [...current, ...extras] : current
    })
  }, [dayId, loaded])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const history = useMemo(
    () => buildCellHistory(rows, ["description", "broughtOnSite", "materialUsed"]),
    [rows]
  )

  const persist = useCallback(
    async (nextRows) => {
      setSaveState("saving")
      try {
        await saveMaterialSiteRows(projectId, dayId, nextRows)
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
      void saveMaterialSiteRows(projectId, dayId, rowsRef.current)
    }
    window.addEventListener("pagehide", flush)
    return () => {
      window.clearTimeout(saveTimerRef.current)
      window.removeEventListener("pagehide", flush)
    }
  }, [dayId, projectId])

  function commitRows(updater, { immediate = false } = {}) {
    setRows((current) => {
      const next = typeof updater === "function" ? updater(current) : updater
      if (immediate) void persist(next)
      else schedulePersist(next)
      return next
    })
    setSaveState(immediate ? "saving" : "pending")
  }

  function updateRow(rowId, patch) {
    commitRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialSiteDailyFileHref(projectId, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily dashboard
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Material on site entry</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {dayLabel} · Material brought on site starts from material received for this date and can
          be edited. Material left is material brought on site minus material used.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Material on site entry table</h2>
          <div className="flex flex-wrap items-center gap-3">
            <TableExportButtons
              columns={[
                { key: "description", label: "Description", align: "left", kind: "text" },
                { key: "broughtOnSite", label: "Material brought on site", align: "right", kind: "number", total: false },
                { key: "materialUsed", label: "Material used", align: "right", kind: "number", total: false },
                { key: "materialLeft", label: "Material left", align: "right", kind: "number", total: false },
              ]}
              rows={rows.map((row) => ({ ...row, materialLeft: leftFor(row) }))}
              title={`Material on site entry · ${dayLabel}`}
              projectName={projectName}
              filename={`material-on-site-entry-${dayId}`}
              showTotal={false}
            />
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="border-b border-zinc-200 px-3 py-3">Description</th>
                <th className="border-b border-zinc-200 px-3 py-3 text-right">Material brought on site</th>
                <th className="border-b border-zinc-200 px-3 py-3 text-right">Material used</th>
                <th className="border-b border-zinc-200 px-3 py-3 text-right">Material left</th>
                <th className="border-b border-zinc-200 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 align-top">
                    <MemoryTextInput
                      value={row.description}
                      aria-label="Description"
                      placeholder="Description"
                      suggest={(query) =>
                        searchCellHistory(history, "description", { query, description: "" })
                      }
                      onChange={(value) => updateRow(row.id, { description: value })}
                      className="w-full min-w-40 rounded-lg border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-zinc-500"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <FormulaAmountInput
                      value={row.broughtOnSite}
                      formula={row.broughtOnSiteFormula || ""}
                      ariaLabel="Material brought on site"
                      onChange={(value, formula) =>
                        updateRow(row.id, {
                          broughtOnSite: value,
                          broughtOnSiteFormula: formula || "",
                          broughtTouched: true,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <FormulaAmountInput
                      value={row.materialUsed}
                      formula={row.materialUsedFormula || ""}
                      ariaLabel="Material used"
                      onChange={(value, formula) =>
                        updateRow(row.id, {
                          materialUsed: value,
                          materialUsedFormula: formula || "",
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums font-medium text-zinc-900">
                    <p className="px-2 py-2">{formatMaterialAmount(leftFor(row))}</p>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    {row.fromReceived ? null : (
                      <button
                        type="button"
                        aria-label="Delete row"
                        onClick={() =>
                          commitRows(
                            (current) => {
                              const next = current.filter((item) => item.id !== row.id)
                              return next.length > 0 ? next : [blankRow()]
                            },
                            { immediate: true }
                          )
                        }
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Icon name="trash-2" size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => commitRows((current) => [...current, blankRow()], { immediate: true })}
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
