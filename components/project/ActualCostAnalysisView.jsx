"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import EntryUndoButton from "@/components/project/EntryUndoButton"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import Icon from "@/components/icon/icon"
import MaterialScheduleFormulaCell from "@/components/project/MaterialScheduleFormulaCell"
import { subscribeGroveStore } from "@/lib/groveClientStore"
import { useEntryUndo } from "@/lib/useEntryUndo"
import {
  createGrandTotalRow,
  createPlantSubRow,
  isGrandTotalRow,
  isPlantSubRow,
  listBoqAnalysisItems,
  mergeActualCostAnalysisWithBoq,
  parentHasPlantRows,
  PLANT_COST_COLUMN_KEYS,
  RATE_BUILD_UP_COLUMNS,
  RATE_COLUMN_KEYS,
  resolveActualCostAnalysisRow,
  resolveGrandTotalRow,
  saveActualCostAnalysisRows,
  stripRateFieldsFromRow,
  syncBoqRatesFromBuildUp,
} from "@/lib/actualCostAnalysis"
import {
  BOQ_STORAGE_KEY,
  getProjectBoqs,
  normalizeBoqDescription,
  updateProjectBoqItems,
} from "@/lib/boqData"
import { isFormula } from "@/lib/materialScheduleFormulas"
import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
  formatMaterialRate,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import { getRateAnalysisHubHref } from "@/lib/rateAnalysis"
import { applyZimBuildSuggestionToRow } from "@/lib/zimBuildQs"

function computedDisplay(row, key) {
  if (key === "fuelCost" || key === "plantCost" || key === "totalCost" || key === "laborCost" || key === "materialCost") {
    if (row[key] === null || row[key] === undefined) {
      if (key === "laborCost" && row.resolvedLaborCost != null) {
        return formatMaterialCurrencyAmount(row.resolvedLaborCost)
      }
      if (key === "materialCost" && row.resolvedMaterialCost != null) {
        return formatMaterialCurrencyAmount(row.resolvedMaterialCost)
      }
      return "—"
    }
    return formatMaterialCurrencyAmount(row[key])
  }
  if (key === "rate" || key === "billRate" || key === "allowableRate") return formatMaterialRate(row[key])
  return "—"
}

function formatEntryDisplay(columnKey, value) {
  if (isFormula(value)) return String(value)
  const numeric = parsePlantCostAmount(value)
  if (numeric === null) return String(value ?? "")
  if (columnKey === "production" || columnKey === "fuelAllocated" || columnKey === "materialQty") {
    return formatMaterialAmount(numeric)
  }
  return formatMaterialCurrencyAmount(numeric)
}

function acceptPercentEntry(value, formula) {
  const source = isFormula(formula) ? formula : value
  if (isFormula(source)) return { value, formula }
  const text = String(value ?? "").trim()
  if (!text) return { value: "", formula: "" }
  if (!/^\d+(\.\d+)?\s*%?$/.test(text)) return null
  return { value: text.replace("%", "").trim(), formula: "" }
}

function findParentRow(rows, row) {
  if (!row?.parentId) return null
  return rows.find((item) => item.id === row.parentId) ?? null
}

function groupCostRows(rows, parentId) {
  return rows.filter(
    (row) =>
      row.id === parentId || (isPlantSubRow(row) && row.parentId === parentId)
  )
}

function shouldShowColumn(row, columnKey, rows) {
  if (columnKey === "activityDescription") return true

  if (isGrandTotalRow(row)) {
    return (
      columnKey === "plantCost" ||
      columnKey === "laborCost" ||
      columnKey === "materialCost" ||
      columnKey === "totalCost" ||
      RATE_COLUMN_KEYS.has(columnKey)
    )
  }

  const parentId = isPlantSubRow(row) ? row.parentId : row.id
  const inPlantMode = parentHasPlantRows(rows, parentId)

  if (isPlantSubRow(row)) {
    return PLANT_COST_COLUMN_KEYS.has(columnKey)
  }

  if (inPlantMode) {
    // Main activity row: description + plant name (+) + cost fields; rates move to Grand total.
    return columnKey === "plantName" || PLANT_COST_COLUMN_KEYS.has(columnKey)
  }

  return true
}

export default function ActualCostAnalysisView({ projectId, projectName, onClose }) {
  const [rows, setRows] = useState([])
  const { canUndo, trackBeforeChange, undo, clear: clearUndo } = useEntryUndo()
  const exitHref = getRateAnalysisHubHref(projectId)
  const persistTimerRef = useRef(0)
  const syncBoqTimerRef = useRef(0)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const flushPersist = (next, { syncBoq = false, remember = true } = {}) => {
    saveActualCostAnalysisRows(projectId, next, { remember, syncBoq })
    if (syncBoq) return
    window.clearTimeout(syncBoqTimerRef.current)
    syncBoqTimerRef.current = window.setTimeout(() => {
      syncBoqRatesFromBuildUp(projectId)
    }, 900)
  }

  const persistRows = (next, { immediate = false } = {}) => {
    window.clearTimeout(persistTimerRef.current)
    if (immediate) {
      flushPersist(next, { syncBoq: true, remember: true })
      return
    }
    flushPersist(next, { syncBoq: false, remember: true })
    persistTimerRef.current = window.setTimeout(() => {
      flushPersist(rowsRef.current, { syncBoq: true, remember: true })
    }, 700)
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      window.clearTimeout(persistTimerRef.current)
      window.clearTimeout(syncBoqTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const load = () => {
      clearUndo()
      if (listBoqAnalysisItems(projectId).length === 0) {
        setRows([])
        return
      }
      const merged = mergeActualCostAnalysisWithBoq(projectId)
      setRows(merged)
      saveActualCostAnalysisRows(projectId, merged, { remember: false, syncBoq: false })
    }

    load()
    return subscribeGroveStore((key) => {
      if (key === BOQ_STORAGE_KEY) load()
    })
  }, [projectId, clearUndo])

  const resolvedRows = useMemo(() => {
    return rows.map((row) => {
      if (isGrandTotalRow(row)) {
        return resolveGrandTotalRow(row, groupCostRows(rows, row.parentId))
      }
      return resolveActualCostAnalysisRow(row)
    })
  }, [rows])

  const exportToPdf = async () => {
    const { exportRateBuildUpPdf } = await import("@/lib/rateBuildUpPdf")
    exportRateBuildUpPdf({ projectName, rows })
  }

  const updateRow = (rowIndex, field, value, formula = "", percentOnly = false) => {
    const entry = percentOnly ? acceptPercentEntry(value, formula) : { value, formula }
    if (!entry) return
    setRows((current) => {
      trackBeforeChange(current, `${rowIndex}:${field}`)
      const next = current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: entry.value, [`${field}Formula`]: entry.formula } : row
      )
      persistRows(next)
      return next
    })
  }

  const addPlantSubRow = (anchorIndex) => {
    setRows((current) => {
      const anchor = current[anchorIndex]
      if (!anchor || isGrandTotalRow(anchor)) return current

      const parent = isPlantSubRow(anchor) ? findParentRow(current, anchor) : anchor
      if (!parent || isPlantSubRow(parent) || isGrandTotalRow(parent)) return current

      trackBeforeChange(current)
      const plant = createPlantSubRow(parent)
      const parentIndex = current.findIndex((row) => row.id === parent.id)
      if (parentIndex < 0) return current

      let insertAt = parentIndex + 1
      while (
        insertAt < current.length &&
        isPlantSubRow(current[insertAt]) &&
        current[insertAt].parentId === parent.id
      ) {
        insertAt += 1
      }

      const alreadyHasGrand = current.some(
        (row) => isGrandTotalRow(row) && row.parentId === parent.id
      )
      const next = [...current]
      next.splice(insertAt, 0, plant)

      if (!alreadyHasGrand) {
        const liveParent = next[parentIndex]
        const grand = createGrandTotalRow(liveParent)
        next[parentIndex] = {
          ...stripRateFieldsFromRow(liveParent),
          unit: String(liveParent.unit ?? "").trim(),
        }
        let grandAt = parentIndex + 1
        while (
          grandAt < next.length &&
          isPlantSubRow(next[grandAt]) &&
          next[grandAt].parentId === parent.id
        ) {
          grandAt += 1
        }
        next.splice(grandAt, 0, grand)
      }

      persistRows(next)
      return next
    })
  }

  const removePlantSubRow = (rowIndex) => {
    setRows((current) => {
      const target = current[rowIndex]
      if (!target || !isPlantSubRow(target)) return current
      trackBeforeChange(current)
      const parentId = target.parentId
      let next = current.filter((_, index) => index !== rowIndex)
      const remainingPlants = next.filter(
        (row) => isPlantSubRow(row) && row.parentId === parentId
      )

      if (remainingPlants.length === 0) {
        const grand = next.find((row) => isGrandTotalRow(row) && row.parentId === parentId)
        next = next
          .map((row) => {
            if (row.id !== parentId) return row
            return {
              ...row,
              unit: String(grand?.unit ?? row.unit ?? "").trim(),
              production: String(grand?.production ?? "").trim(),
              productionFormula: grand?.productionFormula ?? "",
              overheads: String(grand?.overheads ?? "").trim(),
              overheadsFormula: grand?.overheadsFormula ?? "",
              profit: String(grand?.profit ?? "").trim(),
              profitFormula: grand?.profitFormula ?? "",
              allowablePercentage: String(grand?.allowablePercentage ?? "").trim(),
              allowablePercentageFormula: grand?.allowablePercentageFormula ?? "",
            }
          })
          .filter((row) => !(isGrandTotalRow(row) && row.parentId === parentId))
      }

      persistRows(next)
      return next
    })
  }

  const deleteRow = (rowIndex) => {
    const target = rows[rowIndex]
    if (!target || isGrandTotalRow(target)) return

    if (isPlantSubRow(target)) {
      const label = String(target.plantName ?? "").trim() || "this plant row"
      if (!window.confirm(`Delete plant row "${label}"?`)) return
      removePlantSubRow(rowIndex)
      return
    }

    const label = String(target.activityDescription ?? "").trim() || "this row"
    const confirmed = window.confirm(
      `Delete "${label}" from Rate build up?\n\nIt will also be removed from the BOQ and every page that uses this description.`
    )
    if (!confirmed) return

    const needle = normalizeBoqDescription(target.activityDescription)
    setRows((current) => {
      trackBeforeChange(current)
      const next = current.filter(
        (row) => row.id !== target.id && row.parentId !== target.id
      )
      persistRows(next)
      return next
    })

    if (needle) {
      for (const boq of getProjectBoqs(projectId)) {
        const items = (boq.items ?? []).filter(
          (item) => normalizeBoqDescription(item.itemName) !== needle
        )
        if (items.length !== (boq.items ?? []).length) {
          updateProjectBoqItems(projectId, boq.id, items)
        }
      }
    }
  }

  const applyZimBuild = (rowIndex) => {
    setRows((current) => {
      trackBeforeChange(current)
      const next = current.map((row, index) => {
        if (index !== rowIndex) return row
        return applyZimBuildSuggestionToRow(row, row.zimBuildSuggestion)
      })
      persistRows(next)
      return next
    })
  }

  const handleUndo = () => {
    const previous = undo()
    if (!previous) return
    setRows(previous)
    persistRows(previous, { immediate: true })
  }

  const exitControl =
    typeof onClose === "function" ? (
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
      >
        <Icon name="x" size={15} />
        Exit template
      </button>
    ) : (
      <Link
        href={exitHref}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
      >
        <Icon name="x" size={15} />
        Exit template
      </Link>
    )

  const renderCell = (row, rowIndex, column, resolved) => {
    const visible = shouldShowColumn(row, column.key, rows)
    if (!visible) {
      return <div className="px-2 py-1.5 text-zinc-300">—</div>
    }

    const grand = isGrandTotalRow(row)
    const plantSub = isPlantSubRow(row)

    if (column.key === "activityDescription") {
      if (grand) {
        return (
          <p className="px-1 text-sm font-semibold text-zinc-900">Grand total</p>
        )
      }
      if (plantSub) {
        return <span className="block px-1 text-xs text-zinc-400">└ plant</span>
      }
      const zim = row.zimBuildSuggestion
      return (
        <div className="group relative space-y-2">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-snug text-zinc-900">
            {row.activityDescription}
          </p>
          {zim ? (
            <div className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-600 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
              <p className="font-medium text-zinc-700">ZimBuild QS suggestion</p>
              <p>
                Daily cost {formatMaterialCurrencyAmount(zim.dailyCost)} · Daily production{" "}
                {formatMaterialAmount(zim.dailyProduction)}
                {zim.unit ? ` ${zim.unit}` : ""}
              </p>
              <button
                type="button"
                onClick={() => applyZimBuild(rowIndex)}
                className="mt-1 font-medium text-zinc-800 underline-offset-2 hover:underline"
              >
                Apply suggestion
              </button>
            </div>
          ) : null}
        </div>
      )
    }

    if (column.key === "plantName" && !grand) {
      return (
        <div className="relative pb-7">
          <MaterialScheduleFormulaCell
            projectId={projectId}
            description={row.activityDescription}
            columnKey={column.key}
            rawValue={row[column.key] ?? ""}
            formulaValue={row[`${column.key}Formula`] ?? ""}
            align={column.align}
            numeric={false}
            wrapText
            columnLabel={column.label}
            onChange={(value, formula) => updateRow(rowIndex, column.key, value, formula, false)}
          />
          <button
            type="button"
            onClick={() => addPlantSubRow(rowIndex)}
            title="Add plant row"
            className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      )
    }

    if (grand) {
      if (
        column.key === "plantCost" ||
        column.key === "laborCost" ||
        column.key === "materialCost" ||
        column.key === "totalCost" ||
        column.key === "rate" ||
        column.key === "billRate" ||
        column.key === "allowableRate"
      ) {
        return (
          <div className="px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
            {computedDisplay(resolved, column.key)}
          </div>
        )
      }
    }

    if (column.computed) {
      return (
        <div className="px-2 py-1.5 text-right text-sm font-medium tabular-nums text-zinc-900">
          {computedDisplay(resolved, column.key)}
        </div>
      )
    }

    return (
      <MaterialScheduleFormulaCell
        projectId={projectId}
        description={row.activityDescription}
        columnKey={column.key}
        rawValue={row[column.key] ?? ""}
        formulaValue={row[`${column.key}Formula`] ?? ""}
        align={column.align}
        numeric={Boolean(column.numeric)}
        wrapText={column.key === "plantName"}
        columnLabel={column.label}
        formatDisplay={
          column.percent
            ? (value) =>
                String(value ?? "").trim() === ""
                  ? ""
                  : `${String(value).replace("%", "").trim()}%`
            : column.numeric
              ? (value) => formatEntryDisplay(column.key, value)
              : undefined
        }
        onChange={(value, formula) =>
          updateRow(rowIndex, column.key, value, formula, Boolean(column.percent))
        }
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-stretch justify-center bg-zinc-950/45 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rate build up template"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && typeof onClose === "function") onClose()
      }}
    >
      <div className="flex h-full w-full max-w-[96rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Rate build up template</p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              {projectName}
            </h1>
            <p className="max-w-3xl text-sm text-zinc-500">
              Edit inside this template. Scrolling stays here until you exit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > 0 ? (
              <>
                <EntryUndoButton canUndo={canUndo} onUndo={handleUndo} />
                <ExportPdfButton onClick={exportToPdf} />
              </>
            ) : null}
            {exitControl}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-700">No BOQ uploaded yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Exit this template and upload a Client BOQ on Rate analysis first.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[2100px] border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                  {RATE_BUILD_UP_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-semibold ${column.align === "left" ? "text-left" : "text-right"}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 w-24 bg-zinc-900 px-3 py-3 text-right font-semibold">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const resolved = resolvedRows[rowIndex]
                  const plantSub = isPlantSubRow(row)
                  const grand = isGrandTotalRow(row)
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-zinc-200 align-top ${
                        grand
                          ? "bg-amber-50/70"
                          : plantSub
                            ? "bg-zinc-50/80"
                            : "bg-white"
                      }`}
                    >
                      {RATE_BUILD_UP_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-3 ${
                            column.key === "activityDescription"
                              ? "min-w-[20rem] w-[28rem] max-w-[36rem] align-top"
                              : column.key === "plantName"
                                ? "min-w-[12rem] max-w-[16rem] align-top"
                                : ""
                          }`}
                        >
                          {renderCell(row, rowIndex, column, resolved)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right align-top">
                        {grand ? null : (
                          <button
                            type="button"
                            onClick={() => deleteRow(rowIndex)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                          >
                            <Icon name="trash-2" size={13} />
                            Delete
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

        <p className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 sm:px-5">
          Plant cost = fuel cost + plant hire. Daily cost (total) = labour + plant + material. Actual
          rate = Daily cost ÷ Daily production. Bill rate adds overheads and profit. Use + on Plant
          name to add plant rows; rates then sit on the Grand total row.
        </p>
      </div>
    </div>
  )
}
