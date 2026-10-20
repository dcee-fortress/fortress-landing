"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import TableExportButtons from "@/components/project/TableExportButtons"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getMaterialSiteDailyFile,
  getMaterialSiteDashboardLines,
  renameMaterialSiteFile,
} from "@/lib/materialSiteStock"
import {
  getMaterialSiteDailyFileHref,
  getMaterialSiteDailyHref,
  getMaterialSiteEntryHref,
} from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "broughtOnSite", label: "Material brought on site", align: "right", kind: "number", total: false },
  { key: "materialUsed", label: "Material used", align: "right", kind: "number", total: false },
  { key: "materialLeft", label: "Material left in storeroom", align: "right", kind: "number", total: false },
]

export default function MaterialSiteDayView({ projectId, projectName, dayId }) {
  const router = useRouter()
  const { version, refresh } = useProjects()
  void version
  const [dateValue, setDateValue] = useState(dayId)
  const [savingDate, setSavingDate] = useState(false)

  useEffect(() => {
    setDateValue(dayId)
  }, [dayId])

  const file = getMaterialSiteDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const lines = getMaterialSiteDashboardLines(projectId, dayId)

  async function handleDateChange(event) {
    const nextDayId = event.target.value
    setDateValue(nextDayId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDayId) || nextDayId === dayId || savingDate) return

    setSavingDate(true)
    try {
      const result = await renameMaterialSiteFile(projectId, dayId, nextDayId)
      if (!result.ok) {
        window.alert(result.message || "Could not change the file date.")
        setDateValue(dayId)
        return
      }
      refresh()
      router.replace(getMaterialSiteDailyFileHref(projectId, nextDayId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not change the file date.")
      setDateValue(dayId)
    } finally {
      setSavingDate(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialSiteDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Daily material on site</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Material brought on site can be edited in the entry. Material
          left is material brought on site minus material used. Similar descriptions are one line.
        </p>
        <label className="flex w-fit flex-col gap-1 pt-1 text-sm font-medium text-zinc-700">
          File date
          <input
            type="date"
            value={dateValue}
            disabled={savingDate}
            onChange={(event) => void handleDateChange(event)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/15 disabled:opacity-60"
          />
        </label>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Material on site table</h2>
          <div className="flex flex-wrap items-center gap-2">
            <TableExportButtons
              columns={COLUMNS}
              rows={lines}
              title={`Daily material on site · ${dayLabel}`}
              projectName={projectName}
              filename={`material-on-site-${dayId}`}
              showTotal={false}
            />
            <Link
              href={getMaterialSiteEntryHref(projectId, dayId)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Icon name="package" size={16} />
              Material on site entry
            </Link>
          </div>
        </div>
        <MaterialRegisterTable
          columns={COLUMNS}
          lines={lines}
          emptyMessage="Nothing brought on site this day. Material received for this date, or a quantity entered in the entry, appears here."
        />
      </section>
    </div>
  )
}
