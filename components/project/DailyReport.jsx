"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import DailyHourlyDashboard from "@/components/project/DailyHourlyDashboard"
import EarnedValueReportTable from "@/components/project/EarnedValueReportTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getMissingSlotTemplates,
  sortSlots,
} from "@/lib/dailySlots"
import { createSlotFromTemplate } from "@/lib/projectData"
import { getDailyFileEntryStatus } from "@/lib/dailyFileSync"
import { getDailyValueHref } from "@/lib/projectRoutes"

function makeDailyReportRow() {
  return {
    id: `daily-report-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    cost: "",
    production: "",
    rate: "",
  }
}

export default function DailyReport({ projectName, projectId, file, hideHourlyDashboards = false }) {
  const { version, getSlotsForDay, saveSlotsForDay, getDaySummary } = useProjectData()
  void version

  const storageKey = `daily-report-word-editor-${projectId}-${file.id}`
  const [reportRows, setReportRows] = useState([])
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") {
      setReportRows([makeDailyReportRow()])
      return
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setReportRows(Array.isArray(parsed) && parsed.length > 0 ? parsed : [makeDailyReportRow()])
    } catch {
      setReportRows([makeDailyReportRow()])
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(reportRows))
    }
  }, [storageKey, reportRows])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const handlePageHide = () => {
      window.localStorage.setItem(storageKey, JSON.stringify(reportRows))
    }

    window.addEventListener("pagehide", handlePageHide)
    return () => window.removeEventListener("pagehide", handlePageHide)
  }, [storageKey, reportRows])

  const slots = getSlotsForDay(file.id)
  const summary = getDaySummary(file.id)
  const status = getDailyFileEntryStatus(projectId, file)
  const reportRowsWithIds = reportRows.length > 0 ? reportRows : [makeDailyReportRow()]

  const missingSlots = getMissingSlotTemplates(slots)

  const persistSlots = (nextSlots) => {
    saveSlotsForDay(file.id, sortSlots(nextSlots))
  }

  const deleteSlot = (slotId) => {
    persistSlots(slots.filter((slot) => slot.id !== slotId))
  }

  const addNextHourlyDashboard = () => {
    const nextTemplate = missingSlots[0]
    if (!nextTemplate) return

    const slot = createSlotFromTemplate(nextTemplate)
    if (!slot) return

    persistSlots([...slots, slot])
  }

  const updateSlot = (updatedSlot) => {
    persistSlots(slots.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)))
  }

  const updateReportRow = (rowId, field, value) => {
    setReportRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row

        const nextRow = { ...row, [field]: value }
        const costValue = Number.parseFloat(String(nextRow.cost ?? ""))
        const productionValue = Number.parseFloat(String(nextRow.production ?? ""))

        if (field === "cost" || field === "production") {
          if (productionValue && productionValue !== 0) {
            nextRow.rate = (costValue / productionValue).toFixed(2)
          } else {
            nextRow.rate = ""
          }
        }

        return nextRow
      })
    )
  }

  const addReportRow = () => {
    setReportRows((current) => [...current, makeDailyReportRow()])
  }

  const deleteReportRow = (rowId) => {
    setReportRows((current) => {
      const filtered = current.filter((row) => row.id !== rowId)
      return filtered.length > 0 ? filtered : [makeDailyReportRow()]
    })
  }

  const saveReportRows = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(reportRowsWithIds))
    }
    setSaveMessage("Saved locally for tomorrow. You can reopen this page and push it to the live website when ready.")
  }

  const exportDailyTotal = async () => {
    const { exportDailyTotalPdf } = await import("@/lib/earnedValuePdf")
    exportDailyTotalPdf({ projectName, file, summary })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
          <Link
            href={getDailyValueHref(projectId)}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            <Icon name="arrow-left" size={16} />
            Back to daily files
          </Link>
          <header className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Daily cost
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{file.label}</h1>
          </header>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Daily valuation notes</h2>
              <p className="text-sm text-zinc-500">
                This is the Word-style space for the description, cost, production and rate. Keep the linked valuation dashboard as it is and edit this section here.
              </p>
            </div>
            <button
              type="button"
              onClick={addReportRow}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Icon name="plus" size={16} />
              Add row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto px-6 py-6">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                <th className="px-3 py-3 font-semibold text-left">Description</th>
                <th className="px-3 py-3 font-semibold text-right">Cost</th>
                <th className="px-3 py-3 font-semibold text-right">Production</th>
                <th className="px-3 py-3 font-semibold text-right">Rate</th>
                <th className="px-3 py-3 text-right font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {reportRowsWithIds.map((row) => (
                <tr key={row.id} className="border-b border-zinc-200 align-top">
                  <td className="px-3 py-3">
                    <textarea
                      rows={3}
                      value={row.description}
                      onChange={(event) => updateReportRow(row.id, "description", event.target.value)}
                      placeholder="Type your daily valuation notes here..."
                      className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm leading-snug text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.cost}
                      onChange={(event) => updateReportRow(row.id, "cost", event.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.production}
                      onChange={(event) => updateReportRow(row.id, "production", event.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.rate}
                      onChange={(event) => updateReportRow(row.id, "rate", event.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteReportRow(row.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-sm text-zinc-600">
            {saveMessage || "This is a draft only. It remains in the browser until you are ready to publish it to the live website."}
          </p>
          <button
            type="button"
            onClick={saveReportRows}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
          >
            <Icon name="save" size={16} />
            Save daily text
          </button>
        </div>
      </section>

      <article className="project-report overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {projectName}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-900">{file.label}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {status.key === "awaiting"
                  ? "New daily file — add hourly dashboards and save material schedules to enter data."
                  : status.key === "in-progress"
                    ? "Today's data in progress — totals update as hourly material schedules are saved."
                    : `File completed: ${file.completedAt}`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                status.key === "awaiting"
                  ? "bg-sky-50 text-sky-800 ring-sky-200"
                  : status.key === "in-progress"
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="px-8 py-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Daily Total (Roll-up from Hourly Dashboards)
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            {status.key === "awaiting"
              ? "No hourly data yet. Add hourly dashboards below, then enter and save material schedules."
              : `Hourly dashboard entries roll up to daily, weekly, monthly, and project to date totals (${slots.length} active dashboard${slots.length === 1 ? "" : "s"}).`}
          </p>
          <EarnedValueReportTable summary={summary} onExportPdf={exportDailyTotal} />
        </div>
      </article>

      {!hideHourlyDashboards && <section className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Hourly Dashboards</h2>
            <p className="text-sm text-zinc-500">
              Enter values in material schedules on each hourly dashboard. Totals roll up to daily, weekly, monthly, and project to date.
            </p>
          </div>

          <button
            type="button"
            disabled={missingSlots.length === 0}
            onClick={addNextHourlyDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            <Icon name="plus" size={16} />
            Add Hourly Dashboard
          </button>
        </div>

        {slots.length > 0 ? (
          <div className="space-y-4">
            {sortSlots(slots).map((slot) => (
              <DailyHourlyDashboard
                key={`${slot.id}-${version}`}
                slot={slot}
                projectId={projectId}
                projectName={projectName}
                dayLabel={file.label}
                dayId={file.id}
                onDelete={deleteSlot}
                onChange={updateSlot}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-zinc-500">
            No hourly dashboards yet. Use &quot;Add Hourly Dashboard&quot;, then open each slot&apos;s
            material schedule to enter and save today&apos;s data.
          </div>
        )}
      </section>}
    </div>
  )
}
