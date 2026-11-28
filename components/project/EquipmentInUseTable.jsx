"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import HoursFieldInput from "@/components/project/HoursFieldInput"
import TableCellInput from "@/components/project/TableCellInput"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  createManualEquipmentRow,
  formatOperatingHours,
  getDailyEquipmentHoursData,
  getEquipmentOperatingHoursInputValue,
  resolveEquipmentOperatingHours,
  saveDailyEquipmentHoursData,
  saveManualEquipmentRows,
} from "@/lib/equipmentHoursData"
import { getEquipmentInUseReport } from "@/lib/equipmentInUse"
import { getPlantOperatorsHref } from "@/lib/plantOperatorRegisters"

async function exportEquipmentPdf(projectName, report, period, mode = "download") {
  const { exportEquipmentInUsePdf } = await import("@/lib/equipmentInUsePdf")
  await exportEquipmentInUsePdf({ projectName, report, period, mode })
}

function HoursCell({ value, onChange, placeholder }) {
  return (
    <td className="min-w-[10rem] border border-zinc-200 bg-zinc-50 px-2 py-2">
      <HoursFieldInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="min-w-[8.5rem]"
      />
    </td>
  )
}

function EquipmentInUseDailyTable({ projectId, projectName, fileId, report }) {
  const { version } = useProjectData()
  const [hoursById, setHoursById] = useState(() => getDailyEquipmentHoursData(projectId, fileId).entries)
  const [manualRows, setManualRows] = useState(
    () => getDailyEquipmentHoursData(projectId, fileId).manualRows ?? []
  )

  const [loadedVersion, setLoadedVersion] = useState(version)

  if (loadedVersion !== version) {
    setLoadedVersion(version)
    const storedDay = getDailyEquipmentHoursData(projectId, fileId)
    if (JSON.stringify(storedDay.entries) !== JSON.stringify(hoursById)) {
      setHoursById(storedDay.entries)
    }
    if (JSON.stringify(storedDay.manualRows ?? []) !== JSON.stringify(manualRows)) {
      setManualRows(storedDay.manualRows ?? [])
    }
  }

  const persist = useCallback(
    (updater) => {
      setHoursById((current) => {
        const nextEntries = typeof updater === "function" ? updater(current) : updater
        saveDailyEquipmentHoursData(projectId, fileId, nextEntries)
        return nextEntries
      })
    },
    [projectId, fileId]
  )

  const updateEntry = (equipmentId, updates) => {
    persist((currentHours) => {
      const current = currentHours[equipmentId] ?? {
        startHours: "",
        finishHours: "",
        hoursOperating: "",
        hoursOperatingEdited: false,
      }

      return {
        ...currentHours,
        [equipmentId]: {
          ...current,
          ...updates,
        },
      }
    })
  }

  const saveManualRows = (nextRows) => {
    setManualRows(nextRows)
    saveManualEquipmentRows(projectId, fileId, nextRows)
  }

  const updateManualRow = (rowId, updates) => {
    saveManualRows(manualRows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)))
  }

  const rows = useMemo(() => {
    void version
    const registerRows = report.equipment.filter((item) => !item.manual)
    const addedRows = manualRows.map((row) => ({ ...row, manual: true }))

    return [...registerRows, ...addedRows].map((item) => {
      const stored = hoursById[item.id] ?? {
        startHours: "",
        finishHours: "",
        hoursOperating: "",
        hoursOperatingEdited: false,
      }
      const startHours = stored.startHours ?? ""
      const finishHours = stored.finishHours ?? ""
      const hoursOperating = resolveEquipmentOperatingHours(stored)
      const hoursOperatingInput = getEquipmentOperatingHoursInputValue(stored)

      return {
        ...item,
        startHours,
        finishHours,
        hoursOperating,
        hoursOperatingInput,
        hoursOperatingEdited: stored.hoursOperatingEdited,
      }
    })
  }, [report.equipment, hoursById, manualRows, version])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <p className="font-semibold uppercase tracking-wide">Equipment in use</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{report.dateLabel}</p>
          <p className="mt-2 text-orange-900/80">
            {report.totalCount} item{report.totalCount === 1 ? "" : "s"} from operators marked
            present in the{" "}
            <Link
              href={getPlantOperatorsHref(projectId)}
              className="font-medium underline decoration-orange-300 underline-offset-2"
            >
              operator register
            </Link>
            . Use Add row to enter extra equipment and fill the empty cells. Scroll sideways for hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => saveManualRows([...manualRows, createManualEquipmentRow()])}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Add row
          </button>
          <ExportPdfButton
            onClick={() =>
              exportEquipmentPdf(
                projectName,
                { ...report, equipment: rows, totalCount: rows.length },
                "daily",
                "download"
              )
            }
            onShareWhatsApp={() =>
              exportEquipmentPdf(
                projectName,
                { ...report, equipment: rows, totalCount: rows.length },
                "daily",
                "whatsapp"
              )
            }
          />
        </div>
      </div>

      <div className="equipment-hours-scroll">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Supplier
              </th>
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Plant name
              </th>
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Operator
              </th>
              <th className="min-w-[9rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Plant number
              </th>
              <th className="min-w-[10rem] border border-zinc-200 bg-zinc-100 px-3 py-2 text-right font-semibold text-zinc-800">
                Start hours
              </th>
              <th className="min-w-[10rem] border border-zinc-200 bg-zinc-100 px-3 py-2 text-right font-semibold text-zinc-800">
                Finish hours
              </th>
              <th className="min-w-[10rem] border border-zinc-200 bg-zinc-100 px-3 py-2 text-right font-semibold text-zinc-800">
                Hours operating
              </th>
              <th className="border border-zinc-200 bg-zinc-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((item) => (
                <tr key={item.id} className="bg-white">
                  {item.manual ? (
                    <>
                      <td className="min-w-[10rem] border border-zinc-200 px-2 py-2">
                        <TableCellInput
                          value={item.supplier}
                          placeholder="Supplier"
                          onChange={(value) => updateManualRow(item.id, { supplier: value })}
                        />
                      </td>
                      <td className="min-w-[10rem] border border-zinc-200 px-2 py-2">
                        <TableCellInput
                          value={item.plant}
                          placeholder="Plant name"
                          onChange={(value) => updateManualRow(item.id, { plant: value })}
                        />
                      </td>
                      <td className="min-w-[10rem] border border-zinc-200 px-2 py-2">
                        <TableCellInput
                          value={item.operatorName}
                          placeholder="Operator"
                          onChange={(value) => updateManualRow(item.id, { operatorName: value })}
                        />
                      </td>
                      <td className="min-w-[9rem] border border-zinc-200 px-2 py-2">
                        <TableCellInput
                          value={item.plantNumber}
                          placeholder="Plant number"
                          onChange={(value) => updateManualRow(item.id, { plantNumber: value })}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                        {item.supplier || "—"}
                      </td>
                      <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                        {item.plant || "—"}
                      </td>
                      <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                        {item.operatorName || "—"}
                      </td>
                      <td className="min-w-[9rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                        {item.plantNumber || "—"}
                      </td>
                    </>
                  )}
                  <HoursCell
                    value={item.startHours}
                    onChange={(value) => updateEntry(item.id, { startHours: value })}
                    placeholder="Start"
                  />
                  <HoursCell
                    value={item.finishHours}
                    onChange={(value) => updateEntry(item.id, { finishHours: value })}
                    placeholder="Finish"
                  />
                  <HoursCell
                    value={item.hoursOperatingInput}
                    onChange={(value) => {
                      if (String(value).trim() === "") {
                        updateEntry(item.id, {
                          hoursOperating: "",
                          hoursOperatingEdited: false,
                        })
                        return
                      }

                      updateEntry(item.id, {
                        hoursOperating: value,
                        hoursOperatingEdited: true,
                      })
                    }}
                    placeholder="Hours"
                  />
                  <td className="border border-zinc-200 px-2 py-2">
                    {item.manual ? (
                      <button
                        type="button"
                        onClick={() => saveManualRows(manualRows.filter((row) => row.id !== item.id))}
                        className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
                >
                  No equipment yet. Tick operators present in the register, or use Add row to
                  enter equipment on this day.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EquipmentInUseTable({
  projectId,
  projectName,
  period,
  fileId,
  embedded = false,
}) {
  const { version } = useProjectData()
  const report = getEquipmentInUseReport(projectId, period, fileId)
  void version

  const isDaily = period === "daily"

  if (isDaily) {
    return (
      <EquipmentInUseDailyTable
        key={`${projectId}-${fileId}`}
        projectId={projectId}
        projectName={projectName}
        fileId={fileId}
        report={report}
      />
    )
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
            <p className="font-semibold uppercase tracking-wide">Equipment in use</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{report.periodLabel}</p>
            <p className="mt-2 text-orange-900/80">
              {report.totalCount} unique item{report.totalCount === 1 ? "" : "s"} across{" "}
              {report.daysWithEquipment} day{report.daysWithEquipment === 1 ? "" : "s"} with register
              ticks. Scroll sideways to see hours.
            </p>
          </div>

          <ExportPdfButton
            onClick={() => exportEquipmentPdf(projectName, report, period, "download")}
            onShareWhatsApp={() => exportEquipmentPdf(projectName, report, period, "whatsapp")}
          />
        </div>
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <p>
            {report.totalCount} unique item{report.totalCount === 1 ? "" : "s"} across{" "}
            {report.daysWithEquipment} day{report.daysWithEquipment === 1 ? "" : "s"} with register
            ticks.
          </p>
          <ExportPdfButton
            onClick={() => exportEquipmentPdf(projectName, report, period, "download")}
            onShareWhatsApp={() => exportEquipmentPdf(projectName, report, period, "whatsapp")}
          />
        </div>
      )}

      <div className="equipment-hours-scroll">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Supplier
              </th>
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Plant name
              </th>
              <th className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Operator
              </th>
              <th className="min-w-[9rem] border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                Plant number
              </th>
              <th className="min-w-[8rem] border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-800">
                Days in use
              </th>
              <th className="min-w-[10rem] border border-zinc-200 bg-zinc-100 px-3 py-2 text-right font-semibold text-zinc-800">
                Hours operating
              </th>
            </tr>
          </thead>
          <tbody>
            {report.equipment.length > 0 ? (
              report.equipment.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                    {item.supplier || "—"}
                  </td>
                  <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                    {item.plant || "—"}
                  </td>
                  <td className="min-w-[10rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                    {item.operatorName || "—"}
                  </td>
                  <td className="min-w-[9rem] border border-zinc-200 px-3 py-2 text-zinc-900">
                    {item.plantNumber || "—"}
                  </td>
                  <td className="min-w-[8rem] border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-700">
                    {item.dayCount}
                  </td>
                  <td className="min-w-[10rem] border border-zinc-200 bg-zinc-50 px-3 py-2 text-right tabular-nums text-zinc-900">
                    {formatOperatingHours(item.hoursOperating)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
                >
                  No equipment marked present in the operator register for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
