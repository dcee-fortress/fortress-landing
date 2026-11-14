"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import RichTextEditor, { countPlainText } from "@/components/project/RichTextEditor"
import WorkingHoursWeatherCard from "@/components/project/WorkingHoursWeatherCard"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import { getSiteReportsPeriodHref } from "@/lib/projectRoutes"
import {
  buildSiteReportBody,
  composeSiteReportDocument,
  extractSiteReportNotes,
  getSiteReportNotes,
  saveSiteReportNotes,
} from "@/lib/siteReport"

function reportHeading(period, file) {
  if (period === "weekly") return file?.label || "Weekly site report"
  if (period === "monthly") return file?.label || "Monthly site report"
  return `Daily site report — ${formatDayLabelFromId(file?.id) || file?.id || ""}`
}

export default function SiteReport({ projectName, projectId, period, file }) {
  const { getDaySummary, getWeekSummary, getMonthSummary, version } = useProjectData()
  const fileId = file?.id
  const [notes, setNotes] = useState("")
  const [notesReady, setNotesReady] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    setNotesReady(false)
    setNotes(getSiteReportNotes(projectId, period, fileId))
    setNotesReady(true)
  }, [fileId, period, projectId])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const summary = useMemo(() => {
    if (!fileId) return null
    if (period === "weekly") return getWeekSummary(fileId)
    if (period === "monthly") return getMonthSummary(fileId)
    return getDaySummary(fileId)
  }, [fileId, getDaySummary, getMonthSummary, getWeekSummary, period, version])

  const generated = useMemo(
    () => (notesReady ? buildSiteReportBody(projectId, period, fileId, summary) : ""),
    [fileId, notesReady, period, projectId, summary]
  )

  const documentHtml = notesReady ? composeSiteReportDocument(generated, notes) : ""

  const handleChange = (html) => {
    const nextNotes = extractSiteReportNotes(html)
    const stored = nextNotes == null ? html : nextNotes
    setNotes(stored)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveSiteReportNotes(projectId, period, fileId, stored)
    }, 400)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSiteReportsPeriodHref(projectId, period)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {period} site reports
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Site report</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {reportHeading(period, file)}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {projectName}. Weather is for this {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}. The document below rolls valuations, materials on site, equipment in use, fuel consumed, and SHEQ incidents onto one page.
        </p>
      </header>

      <WorkingHoursWeatherCard projectName={projectName} reportType={period} reportId={fileId} />

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 md:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Site report document</h2>
        </div>
        <div className="p-4 md:p-6">
          {notesReady ? (
            <RichTextEditor
              editorKey={`${projectId}-${period}-${fileId}`}
              value={documentHtml}
              onChange={handleChange}
              placeholder="Valuations, materials, equipment, fuel, and incidents appear here."
              minHeight={720}
              allowWordImport
              wordExportFileName={`${period}-site-report-${fileId}`}
            />
          ) : (
            <div className="h-[720px] animate-pulse rounded-xl bg-zinc-100" />
          )}
          <p className="no-print mt-2 text-xs text-zinc-500">
            {countPlainText(documentHtml)} words. Tables refresh from the site entries. Writing after Notes stays on this report.
          </p>
        </div>
      </section>
    </div>
  )
}
