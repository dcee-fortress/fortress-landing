"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import TableCellInput from "@/components/project/TableCellInput"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  SHEQ_ALERT_KIND_INSPECTION,
  canTriggerSheqHomeAlert,
  getSheqAlertWeekUsage,
  releaseSheqAlertQuotaForDeletedRow,
  triggerSheqHomeAlert,
} from "@/lib/sheqHomeAlerts"
import {
  SHEQ_SITE_INSPECTION_COLUMNS,
  createEmptyInspectionRow,
  getSheqSiteInspectionPeriodFile,
  getSheqSiteInspectionReport,
  renumberInspectionItems,
  saveSheqSiteInspectionReport,
} from "@/lib/sheqSiteInspection"
import { getSheqSiteInspectionPeriodHref } from "@/lib/projectRoutes"

const PERIOD_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

export default function SheqSiteInspectionEntryView({
  projectId,
  projectName,
  period,
  periodId,
}) {
  const { refresh } = useProjects()
  const file = getSheqSiteInspectionPeriodFile(projectId, period, periodId)
  const periodLabel = file?.label || periodId

  const [report, setReport] = useState(() =>
    getSheqSiteInspectionReport(projectId, period, periodId, { projectName })
  )
  const [saveState, setSaveState] = useState("saved")
  const [alertMessage, setAlertMessage] = useState("")
  const [weekUsage, setWeekUsage] = useState(() =>
    getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION)
  )
  const reportRef = useRef(report)
  const saveTimerRef = useRef(0)
  const dirtyRef = useRef(false)

  useEffect(() => {
    const next = getSheqSiteInspectionReport(projectId, period, periodId, { projectName })
    if (!next.projectName && projectName) next.projectName = projectName
    reportRef.current = next
    dirtyRef.current = false
    setReport(next)
    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
  }, [period, periodId, projectId, projectName])

  useEffect(() => {
    reportRef.current = report
  }, [report])

  const persist = useCallback(
    async (nextReport) => {
      setSaveState("saving")
      try {
        await saveSheqSiteInspectionReport(projectId, period, periodId, nextReport)
        dirtyRef.current = false
        setSaveState("saved")
        refresh()
      } catch {
        setSaveState("error")
      }
    },
    [period, periodId, projectId, refresh]
  )

  // Flush pending edits on leave / tab hide so navigation never drops typed data.
  useEffect(() => {
    const flush = () => {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = 0
      if (!dirtyRef.current) return
      dirtyRef.current = false
      void saveSheqSiteInspectionReport(projectId, period, periodId, reportRef.current)
    }
    const onHide = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      flush()
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [period, periodId, projectId])

  // Re-load when shared store updates (e.g. after returning from another page).
  useEffect(() => {
    const onStorage = () => {
      if (dirtyRef.current || saveTimerRef.current) return
      const next = getSheqSiteInspectionReport(projectId, period, periodId, { projectName })
      const nextAt = Date.parse(next.updatedAt || "") || 0
      const curAt = Date.parse(reportRef.current?.updatedAt || "") || 0
      if (nextAt < curAt) return
      reportRef.current = next
      setReport(next)
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
    }
    window.addEventListener("grove-shared-storage-change", onStorage)
    return () => window.removeEventListener("grove-shared-storage-change", onStorage)
  }, [period, periodId, projectId, projectName])

  const schedulePersist = useCallback(
    (nextReport) => {
      reportRef.current = nextReport
      dirtyRef.current = true
      setReport(nextReport)
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = 0
        void persist(nextReport)
      }, 400)
    },
    [persist]
  )

  const updateHeader = (field, value) => {
    schedulePersist({ ...reportRef.current, [field]: value })
  }

  const updateRow = (rowId, field, value) => {
    const current = reportRef.current
    const rows = current.rows.map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row
    )
    schedulePersist({ ...current, rows })
  }

  const addRow = () => {
    const current = reportRef.current
    const nextNumber = (current.rows?.length || 0) + 1
    const next = {
      ...current,
      rows: [...(current.rows || []), createEmptyInspectionRow(nextNumber)],
    }
    reportRef.current = next
    dirtyRef.current = true
    setReport(next)
    void persist(next)
  }

  const removeRow = (rowId) => {
    const current = reportRef.current
    const rows = renumberInspectionItems(current.rows.filter((row) => row.id !== rowId))
    const next = { ...current, rows }
    reportRef.current = next
    dirtyRef.current = true
    setReport(next)
    void (async () => {
      const result = await releaseSheqAlertQuotaForDeletedRow(projectId, rowId)
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
      if (result.restored > 0) {
        setAlertMessage(
          `Row deleted. ${result.restored} alert${result.restored === 1 ? "" : "s"} restored this week.`
        )
      }
      await persist(next)
    })()
  }

  const sendAlert = async (row) => {
    setAlertMessage("")
    if (!canTriggerSheqHomeAlert(projectId, SHEQ_ALERT_KIND_INSPECTION)) {
      const usage = getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION)
      setAlertMessage(
        `Alert limit reached (${usage.limit} per week). ${usage.used} already used this week.`
      )
      return
    }

    // Persist row content first so reopen always shows what was alerted.
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = 0
    await persist(reportRef.current)

    const result = await triggerSheqHomeAlert({
      projectId,
      projectName: reportRef.current.projectName || projectName,
      period,
      periodId,
      periodLabel,
      row,
      location: reportRef.current.location,
      date: reportRef.current.date,
      kind: SHEQ_ALERT_KIND_INSPECTION,
    })

    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
    if (!result.ok) {
      setAlertMessage(result.message || "Could not send alert.")
      return
    }
    setAlertMessage(
      `Alert sent to the home page. ${result.remaining} alert${result.remaining === 1 ? "" : "s"} left this week.`
    )
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"

  async function exportToPdf() {
    const { exportSheqSiteInspectionPdf } = await import("@/lib/safetyReportPdf")
    exportSheqSiteInspectionPdf({
      projectId,
      projectName,
      period,
      periodId,
      periodLabel,
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link
              href={getSheqSiteInspectionPeriodHref(projectId, period)}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to {PERIOD_LABELS[period] || period} files
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {PERIOD_LABELS[period]} SHEQ site inspection
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{periodLabel}</h1>
            <p className="text-sm text-zinc-500">
              Alerts left this week: {weekUsage.remaining} of {weekUsage.limit} · {saveLabel}
            </p>
            {alertMessage ? <p className="text-sm text-amber-800">{alertMessage}</p> : null}
          </div>
          <ExportPdfButton onClick={() => void exportToPdf()} />
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Project name
            </span>
            <TableCellInput
              value={report.projectName}
              placeholder="Project name"
              onChange={(value) => updateHeader("projectName", value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</span>
            <TableCellInput
              value={report.date}
              placeholder="Date"
              onChange={(value) => updateHeader("date", value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Location
            </span>
            <TableCellInput
              value={report.location}
              placeholder="Location"
              onChange={(value) => updateHeader("location", value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <p className="text-sm text-zinc-600">
            Add rows for each finding. Item numbers are created automatically. Use the alert icon to
            post a home-page alert (max 5 per week). Deleting a row that had an alert restores that
            alert slot.
          </p>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Add row
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50">
                {SHEQ_SITE_INSPECTION_COLUMNS.map((column) => (
                  <th
                    key={column.field}
                    className="border-b border-zinc-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(report.rows || []).length === 0 ? (
                <tr>
                  <td
                    colSpan={SHEQ_SITE_INSPECTION_COLUMNS.length + 1}
                    className="px-3 py-10 text-center text-zinc-500"
                  >
                    No items yet. Click Add row to create the first inspection item.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-zinc-50/80">
                    {SHEQ_SITE_INSPECTION_COLUMNS.map((column) => (
                      <td key={column.field} className="border-t border-zinc-100 px-2 py-1.5">
                        <TableCellInput
                          value={row[column.field] ?? ""}
                          placeholder={column.placeholder}
                          onChange={(value) => updateRow(row.id, column.field, value)}
                          className={
                            column.field === "item"
                              ? "w-16 text-center tabular-nums"
                              : "min-w-[8rem]"
                          }
                        />
                      </td>
                    ))}
                    <td className="border-t border-zinc-100 px-2 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={
                            weekUsage.remaining > 0
                              ? "Send alert to home page"
                              : "Weekly alert limit reached"
                          }
                          disabled={weekUsage.remaining <= 0}
                          onClick={() => void sendAlert(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icon name="triangle-alert" size={18} />
                        </button>
                        <button
                          type="button"
                          title="Delete row"
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50"
                        >
                          <Icon name="trash-2" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
