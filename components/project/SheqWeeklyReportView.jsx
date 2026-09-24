"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import TableCellInput from "@/components/project/TableCellInput"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import {
  SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS,
  SHEQ_WEEKLY_TRAINING_COLUMNS,
  createEmptyTrainingRow,
  getSheqWeeklyIncidentSummary,
  getSheqWeeklyReport,
  saveSheqWeeklyReport,
} from "@/lib/sheqWeeklyReport"
import {
  getSheqWeeklyReportHref,
  getSheqWeeklyReportVariantHref,
} from "@/lib/projectRoutes"

const RichTextEditor = dynamic(() => import("@/components/project/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
      Loading document editor…
    </div>
  ),
})

export default function SheqWeeklyReportView({
  projectId,
  projectName,
  weekId,
  weekLabel,
  variant = "actual",
}) {
  const isTarget = variant === "target"
  const [report, setReport] = useState(() =>
    getSheqWeeklyReport(projectId, weekId, { projectName, variant })
  )
  const [saveState, setSaveState] = useState("saved")
  const reportRef = useRef(report)
  const saveTimerRef = useRef(0)
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (dirtyRef.current) return
    const next = getSheqWeeklyReport(projectId, weekId, { projectName, variant })
    if (!next.projectName && projectName) next.projectName = projectName
    reportRef.current = next
    setReport(next)
  }, [projectId, projectName, weekId, variant])

  useEffect(() => {
    reportRef.current = report
  }, [report])

  const autoIncidentCounts = useMemo(() => {
    if (isTarget) return null
    return getSheqWeeklyIncidentSummary(projectId, weekId)
  }, [isTarget, projectId, weekId])

  const incidentLines = useMemo(() => {
    if (isTarget || !autoIncidentCounts) return []
    const overrides = report.incidentSummary || {}
    return SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS.map((row) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, row.key)
      return {
        key: row.key,
        description: row.description,
        cases: hasOverride
          ? String(overrides[row.key] ?? "")
          : String(autoIncidentCounts[row.key] ?? 0),
      }
    })
  }, [isTarget, autoIncidentCounts, report.incidentSummary])

  const persist = useCallback(
    async (nextReport) => {
      setSaveState("saving")
      try {
        await saveSheqWeeklyReport(projectId, weekId, { ...nextReport, variant })
        dirtyRef.current = false
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [projectId, variant, weekId]
  )

  useEffect(() => {
    const flush = () => {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = 0
      if (!dirtyRef.current) return
      dirtyRef.current = false
      void saveSheqWeeklyReport(projectId, weekId, { ...reportRef.current, variant })
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
  }, [projectId, variant, weekId])

  function schedulePersist(nextReport) {
    dirtyRef.current = true
    reportRef.current = nextReport
    setReport(nextReport)
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void persist(nextReport)
    }, 400)
  }

  function updateTrainingCell(rowId, field, value) {
    const next = {
      ...reportRef.current,
      trainingRows: (reportRef.current.trainingRows || []).map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      ),
    }
    schedulePersist(next)
  }

  function addTrainingRow() {
    const next = {
      ...reportRef.current,
      trainingRows: [...(reportRef.current.trainingRows || []), createEmptyTrainingRow()],
    }
    schedulePersist(next)
  }

  function removeTrainingRow(rowId) {
    const rows = reportRef.current.trainingRows || []
    if (rows.length <= 1) {
      const next = {
        ...reportRef.current,
        trainingRows: [createEmptyTrainingRow()],
      }
      schedulePersist(next)
      return
    }
    const next = {
      ...reportRef.current,
      trainingRows: rows.filter((row) => row.id !== rowId),
    }
    schedulePersist(next)
  }

  function updateIncidentCase(key, value) {
    schedulePersist({
      ...reportRef.current,
      incidentSummary: {
        ...(reportRef.current.incidentSummary || {}),
        [key]: value,
      },
    })
  }

  function handleDocumentChange(html) {
    const next = {
      ...reportRef.current,
      documentHtml: html,
    }
    schedulePersist(next)
  }

  const pageTitle = isTarget ? "Target Weekly SHEQ report" : "Actual Progress Report"
  const backHref = getSheqWeeklyReportVariantHref(projectId, variant)
  const backLabel = isTarget
    ? "Back to Target Weekly SHEQ report"
    : "Back to Actual Progress Report"

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              {backLabel}
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              THE SHEQ WEEKLY REPORT
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
              {pageTitle}
            </h1>
            <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
              {weekLabel || weekId}
              {projectName ? ` · ${projectName}` : ""}
            </p>
            <p className="text-xs text-zinc-500">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                  ? "Could not save — try again."
                  : "Saved"}
            </p>
            <Link
              href={getSheqWeeklyReportHref(projectId)}
              className="inline-flex text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
            >
              All SHEQ weekly report types
            </Link>
          </div>
          <ExportPdfButton
            onClick={() => {
              void import("@/lib/safetyReportPdf").then(({ exportSheqWeeklyReportPdf }) => {
                exportSheqWeeklyReportPdf({
                  projectId,
                  projectName,
                  weekId,
                  weekLabel,
                  variant,
                })
              })
            }}
          />
        </div>
      </header>

      {!isTarget ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Training Conducted Workforce
              </h2>
              <button
                type="button"
                onClick={addTrainingRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
              >
                <Icon name="plus" size={14} />
                Add row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    {SHEQ_WEEKLY_TRAINING_COLUMNS.map((column) => (
                      <th
                        key={column.field}
                        className="border-b border-zinc-200 px-3 py-3 whitespace-nowrap"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="border-b border-zinc-200 px-3 py-3 w-12"> </th>
                  </tr>
                </thead>
                <tbody>
                  {(report.trainingRows || []).map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100">
                      {SHEQ_WEEKLY_TRAINING_COLUMNS.map((column) => (
                        <td key={column.field} className="px-2 py-1.5 align-middle">
                          <TableCellInput
                            value={row[column.field]}
                            placeholder={column.placeholder}
                            align={column.align || "left"}
                            inputMode={column.inputMode || "text"}
                            aria-label={column.label}
                            onChange={(value) => updateTrainingCell(row.id, column.field, value)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          aria-label="Remove training row"
                          onClick={() => removeTrainingRow(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Icon name="trash-2" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Incident summary
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Starts from automatic counts for this week. Click any number of cases cell to type
                your own value — edits save with this report.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    <th className="border-b border-zinc-200 px-4 py-3">Description</th>
                    <th className="border-b border-zinc-200 px-4 py-3 text-right">
                      Number of cases
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incidentLines.map((line) => (
                    <tr key={line.key} className="border-b border-zinc-100">
                      <td className="px-4 py-3 font-medium text-zinc-800">{line.description}</td>
                      <td className="px-2 py-1.5 align-middle">
                        <TableCellInput
                          value={line.cases}
                          placeholder="0"
                          align="right"
                          inputMode="numeric"
                          aria-label={`${line.description} cases`}
                          onChange={(value) => updateIncidentCase(line.key, value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            {isTarget ? "Target SHEQ document" : "SHEQ document"}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isTarget
              ? "Use the Word-style toolbar to write and format this week’s target SHEQ plan — same document platform as Progress reports."
              : "Starts with Major Highlight — edit or replace that heading anytime. Use the Word-style toolbar like Progress reports."}
          </p>
        </div>
        <div className="p-4 md:p-6">
          <RichTextEditor
            editorKey={`${projectId}-sheq-weekly-${variant}-${weekId}`}
            value={report.documentHtml || ""}
            onChange={handleDocumentChange}
            placeholder={
              isTarget
                ? "Write this week’s target SHEQ plan…"
                : "Write SHEQ weekly notes, observations, and actions…"
            }
            minHeight={480}
          />
        </div>
      </section>
    </div>
  )
}
