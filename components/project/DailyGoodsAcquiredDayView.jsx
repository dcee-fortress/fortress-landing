"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Icon from "@/components/icon/icon"
import GoodsAcquiredDashboardTable from "@/components/project/GoodsAcquiredDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getGoodsAcquiredDailyFile,
  getGoodsAcquiredDashboardLinesForDay,
  hasGoodsAcquiredDataForDay,
  renameGoodsAcquiredDailyFile,
} from "@/lib/goodsAcquired"
import {
  getGoodsAcquiredDailyFileHref,
  getGoodsAcquiredDailyHref,
  getGoodsAcquiredEntryHref,
} from "@/lib/projectRoutes"
export default function DailyGoodsAcquiredDayView({ projectId, projectName, dayId }) {
  const router = useRouter()
  const { version, refresh } = useProjects()
  void version
  const [dateValue, setDateValue] = useState(dayId)
  const [savingDate, setSavingDate] = useState(false)

  useEffect(() => {
    setDateValue(dayId)
  }, [dayId])

  const file = getGoodsAcquiredDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const hasData = hasGoodsAcquiredDataForDay(projectId, dayId)
  const lines = getGoodsAcquiredDashboardLinesForDay(projectId, dayId)

  async function handleDateChange(event) {
    const nextDayId = event.target.value
    setDateValue(nextDayId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDayId) || nextDayId === dayId || savingDate) return

    setSavingDate(true)
    try {
      const result = await renameGoodsAcquiredDailyFile(projectId, dayId, nextDayId)
      if (!result.ok) {
        window.alert(result.message || "Could not change the file date.")
        setDateValue(dayId)
        return
      }
      refresh()
      router.replace(getGoodsAcquiredDailyFileHref(projectId, nextDayId))
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
          href={getGoodsAcquiredDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily fuel requested
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Description, unit, quantity, and total cost roll up from the
          fuel requested entry. Matching descriptions are combined. These quantities are
          subtracted from fuel received to find fuel left.
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
          <h2 className="text-base font-semibold text-zinc-900">Fuel requested table</h2>
          <Link
            href={getGoodsAcquiredEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="package" size={16} />
            {hasData ? "Edit entry" : "Fuel requested entry"}
          </Link>
        </div>

        <GoodsAcquiredDashboardTable
          lines={lines}
          emptyMessage="No fuel requested yet. Open Fuel requested entry to add items."
        />
      </section>
    </div>
  )
}
