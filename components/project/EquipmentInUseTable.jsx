"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import HoursFieldInput from "@/components/project/HoursFieldInput"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  formatOperatingHours,
  getDailyEquipmentHoursData,
  getEquipmentOperatingHoursInputValue,
  resolveEquipmentOperatingHours,
  saveDailyEquipmentHoursData,
} from "@/lib/equipmentHoursData"
import { getEquipmentInUseReport } from "@/lib/equipmentInUse"
import { getPlantOperatorsHref } from "@/lib/plantOperatorRegisters"

async function exportEquipmentPdf(projectName, report, period) {
  const { exportEquipmentInUsePdf } = await import("@/lib/equipmentInUsePdf")
  exportEquipmentInUsePdf({ projectName, report, period })
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

  const rows = useMemo(() => {
    void version

    return report.equipment.map((item) => {
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
  }, [report.equipment, hoursById, version])

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
            . Scroll sideways to enter Start hours, Finish hours, and Hours operating.
          </p>
        </div>

        <ExportPdfButton
          onClick={() =>
            exportEquipmentPdf(projectName, { ...report, equipment: rows }, "daily")
          }
        />
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
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((item) => (
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
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
                >
                  No equipment marked present in the operator register for this date. Tick
                  operators present in the register to add equipment to this list.
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
            onClick={() => exportEquipmentPdf(projectName, report, period)}
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
            onClick={() => exportEquipmentPdf(projectName, report, period)}
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
