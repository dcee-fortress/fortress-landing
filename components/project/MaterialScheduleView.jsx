"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import ActivityDescriptionInput from "@/components/project/ActivityDescriptionInput"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import MaterialScheduleFormulaCell from "@/components/project/MaterialScheduleFormulaCell"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  MATERIAL_SCHEDULE_COLUMNS,
  MATERIAL_SCHEDULE_TYPES,
  createMaterialRow,
  formatMaterialScheduleDisplayValue,
  formatMaterialScheduleResolvedValue,
  getHourlyDashboardHref,
  getMaterialFormulaFieldKey,
  getMaterialRawFieldKey,
  normalizeMaterialScheduleRows,
  readMaterialScheduleEditorRows,
  saveMaterialScheduleRows,
  writeMaterialScheduleDraftRows,
} from "@/lib/materialSchedule"
import { getMaterialFormulaHelpText } from "@/lib/materialScheduleFormulas"
import { sortSlots } from "@/lib/dailySlots"
import { formatMaterialCurrencyAmount, formatMaterialAmount } from "@/lib/plantCostCalculations"

function loadMaterialScheduleRows(projectId, dayId, slotId, scheduleType) {
  return readMaterialScheduleEditorRows(projectId, dayId, slotId, scheduleType)
}

function MaterialScheduleEditor({
  projectId,
  projectName,
  dayId,
  dayLabel,
  slotId,
  slotLabel,
  scheduleType,
}) {
  const { saveSlotsForDay, getSlotsForDay, version } = useProjectData()
  const schedule = MATERIAL_SCHEDULE_TYPES[scheduleType]
  const hasEditedRef = useRef(false)
  const rowsRef = useRef([])
  const [rows, setRows] = useState(() =>
    loadMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
  )
  const [savedMessage, setSavedMessage] = useState("")
  const [selectedCell, setSelectedCell] = useState(null)

  rowsRef.current = rows

  useEffect(() => {
    hasEditedRef.current = false
    setRows(loadMaterialScheduleRows(projectId, dayId, slotId, scheduleType))
    setSavedMessage("")
    setSelectedCell(null)
  }, [projectId, dayId, slotId, scheduleType, version])

  useEffect(() => {
    if (!hasEditedRef.current) return undefined

    const timeoutId = window.setTimeout(() => {
      writeMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType, rowsRef.current)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [projectId, dayId, slotId, scheduleType, rows])

  useEffect(() => {
    const flushDraft = () => {
      if (!hasEditedRef.current) return
      writeMaterialScheduleDraftRows(
        projectId,
        dayId,
        slotId,
        scheduleType,
        rowsRef.current
      )
    }

    window.addEventListener("pagehide", flushDraft)
    return () => window.removeEventListener("pagehide", flushDraft)
  }, [projectId, dayId, slotId, scheduleType])

  const markEdited = () => {
    hasEditedRef.current = true
  }

  const resolvedRows = useMemo(() => normalizeMaterialScheduleRows(rows), [rows])
  const grandTotal = resolvedRows.reduce((sum, row) => sum + (row.totalCost ?? 0), 0)
  const productionTotal = resolvedRows.reduce(
    (sum, row) => sum + (row.resolvedProduction ?? 0),
    0
  )

  const updateRow = (rowIndex, field, value, formula = "") => {
    markEdited()
    setSavedMessage("")
    const formulaField = getMaterialFormulaFieldKey(field)
    setRows((current) =>
      current.map((row, index) => {
        if (index !== rowIndex) return row
        return {
          ...row,
          [field]: value,
          [formulaField]: formula,
        }
      })
    )
  }

  const addRow = () => {
    markEdited()
    setSavedMessage("")
    setRows((current) => [...current, createMaterialRow("", dayId)])
  }

  const deleteRow = (rowId) => {
    markEdited()
    setSavedMessage("")
    setRows((current) => current.filter((row) => row.id !== rowId))
    setSelectedCell(null)
  }

  const handleSave = () => {
    saveMaterialScheduleRows(projectId, dayId, slotId, scheduleType, rows)
    hasEditedRef.current = false

    const slots = getSlotsForDay(dayId)
    saveSlotsForDay(dayId, sortSlots(slots))

    setSavedMessage(
      `${schedule.label} saved. On each valuation dashboard, rate = actual cost on site ÷ production.`
    )
  }

  const exportToPdf = async () => {
    const { exportMaterialSchedulePdf } = await import("@/lib/materialSchedulePdf")
    exportMaterialSchedulePdf({
      projectName,
      dayLabel,
      slotLabel,
      scheduleLabel: schedule.label,
      dayId,
      slotId,
      rows: resolvedRows,
      grandTotal,
      productionTotal,
    })
  }

  const selectedColumnLabel = selectedCell
    ? MATERIAL_SCHEDULE_COLUMNS.find((column) => column.key === selectedCell.columnKey)?.label ?? ""
    : ""

  const selectedFieldKey = selectedCell ? getMaterialRawFieldKey(selectedCell.columnKey) : ""
  const selectedFormulaKey = selectedCell ? getMaterialFormulaFieldKey(selectedFieldKey) : ""

  const selectedFormulaValue =
    selectedCell && rows[selectedCell.rowIndex]
      ? rows[selectedCell.rowIndex][selectedFormulaKey] ?? ""
      : ""

  const selectedRawValue =
    selectedCell && rows[selectedCell.rowIndex]
      ? rows[selectedCell.rowIndex][selectedFieldKey] ?? ""
      : ""

  const formulaBarValue = selectedFormulaValue || selectedRawValue

  const selectedColumn = selectedCell
    ? MATERIAL_SCHEDULE_COLUMNS.find((column) => column.key === selectedCell.columnKey)
    : null

  const selectedResultDisplay = (() => {
    if (!selectedCell || !selectedColumn) return ""

    if (selectedFormulaValue && selectedRawValue) {
      return formatMaterialScheduleDisplayValue(selectedColumn.key, selectedRawValue)
    }

    if (selectedColumn.computed && String(selectedRawValue).trim() === "") {
      const resolvedRow = resolvedRows[selectedCell.rowIndex]
      if (resolvedRow) {
        return formatMaterialScheduleResolvedValue(resolvedRow, selectedColumn.key)
      }
    }

    return ""
  })()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getHourlyDashboardHref(projectId, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to hourly dashboards
        </Link>

        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Material Schedule · {schedule.label}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
          <p className="text-sm text-zinc-500">
            {dayLabel} · {slotLabel} · Enter numbers or formulas with figures only, such as{" "}
            <span className="font-mono">=3*4</span>. The answer appears in the cell and is used in
            rate analysis and the hourly dashboard.
          </p>
        </header>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{schedule.label} Material Schedule</h2>
          <p className="mt-1 text-sm text-zinc-500">{getMaterialFormulaHelpText()}</p>
        </div>

        <div className="border-b border-zinc-200 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
              {selectedCell
                ? `${selectedColumnLabel} · Row ${selectedCell.rowIndex + 1}`
                : "Formula"}
            </span>
            <input
              type="text"
              readOnly
              value={formulaBarValue}
              placeholder="Click a cell to see its formula or value"
              className="min-w-[16rem] flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-800"
            />
            {selectedResultDisplay ? (
              <span className="text-sm tabular-nums text-zinc-500">
                Result: {selectedResultDisplay}
              </span>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto px-6 py-6">
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                {MATERIAL_SCHEDULE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 font-semibold ${
                      column.align === "left" ? "text-left" : "text-right"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {resolvedRows.length > 0 ? (
                resolvedRows.map((resolvedRow, rowIndex) => (
                  <tr key={resolvedRow.id} className="border-b border-zinc-200 align-top">
                    {MATERIAL_SCHEDULE_COLUMNS.map((column) => {
                      const fieldKey = getMaterialRawFieldKey(column.key)
                      const formulaKey = getMaterialFormulaFieldKey(fieldKey)
                      const rawValue = rows[rowIndex]?.[fieldKey] ?? ""
                      const formulaValue = rows[rowIndex]?.[formulaKey] ?? ""
                      const resolvedDisplay = formatMaterialScheduleResolvedValue(resolvedRow, column.key)
                      const showAutoValue = column.computed && String(rawValue).trim() === ""

                      return (
                        <td
                          key={column.key}
                          className={`px-3 py-3 ${
                            column.key === "activityDescription" || column.key === "details"
                              ? "min-w-[12rem] max-w-[20rem]"
                              : ""
                          }`}
                        >
                          {column.key === "activityDescription" ? (
                            <ActivityDescriptionInput
                              projectId={projectId}
                              dayId={dayId}
                              slotId={slotId}
                              value={rawValue}
                              refreshKey={version}
                              onChange={(value) => updateRow(rowIndex, fieldKey, value)}
                            />
                          ) : column.key === "details" ? (
                            <textarea
                              rows={2}
                              value={rawValue}
                              onChange={(event) => updateRow(rowIndex, fieldKey, event.target.value)}
                              placeholder="Add row details"
                              className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          ) : (
                            <MaterialScheduleFormulaCell
                              rawValue={rawValue}
                              formulaValue={formulaValue}
                              fallbackDisplay={showAutoValue ? resolvedDisplay : ""}
                              formatDisplay={
                                column.numeric
                                  ? (value) =>
                                      formatMaterialScheduleDisplayValue(column.key, value)
                                  : undefined
                              }
                              align={column.align}
                              numeric={column.numeric}
                              columnLabel={column.label}
                              isSelected={
                                selectedCell?.rowIndex === rowIndex &&
                                selectedCell?.columnKey === column.key
                              }
                              onSelect={() =>
                                setSelectedCell({ rowIndex, columnKey: column.key })
                              }
                              onChange={(value, formula) =>
                                updateRow(rowIndex, fieldKey, value, formula)
                              }
                            />
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(resolvedRow.id)}
                        className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete row"
                      >
                        <Icon name="trash-2" size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={MATERIAL_SCHEDULE_COLUMNS.length + 1}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No material lines yet. Add a row, enter values or formulas, then click Save.
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-zinc-900 bg-zinc-50 font-semibold">
                <td colSpan={MATERIAL_SCHEDULE_COLUMNS.length - 2} className="px-3 py-4 text-zinc-900">
                  Grand Total ({schedule.shortLabel})
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-zinc-900">
                  {formatMaterialCurrencyAmount(grandTotal)}
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-zinc-900">
                  {formatMaterialAmount(productionTotal)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            <Icon name="plus" size={16} />
            Add material line
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {savedMessage ? (
              <p className="text-sm font-medium text-emerald-700">{savedMessage}</p>
            ) : (
              <p className="text-sm text-zinc-500">
                Unsaved edits are kept automatically. Click Save to update the hourly dashboard.
              </p>
            )}
            <ExportPdfButton onClick={exportToPdf} />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Icon name="save" size={16} />
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function MaterialScheduleView(props) {
  const { projectId, dayId, slotId, scheduleType } = props

  return (
    <MaterialScheduleEditor
      key={`${projectId}-${dayId}-${slotId}-${scheduleType}`}
      {...props}
    />
  )
}
