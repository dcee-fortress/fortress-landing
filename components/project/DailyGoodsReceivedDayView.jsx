"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Icon from "@/components/icon/icon"
import AcquiredGoodsBalanceHeading from "@/components/project/AcquiredGoodsBalanceHeading"
import GoodsReceivedDashboardTable from "@/components/project/GoodsReceivedDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getGoodsAcquiredDayTotals } from "@/lib/goodsAcquired"
import {
  getGoodsReceivedDailyFile,
  getGoodsReceivedDashboardLinesForDay,
  hasGoodsReceivedDataForDay,
  renameGoodsReceivedDailyFile,
} from "@/lib/goodsReceived"
import {
  getGoodsReceivedDailyFileHref,
  getGoodsReceivedDailyHref,
  getGoodsReceivedEntryHref,
} from "@/lib/projectRoutes"

export default function DailyGoodsReceivedDayView({ projectId, projectName, dayId }) {
  const router = useRouter()
  const { version, refresh } = useProjects()
  void version
  const [dateValue, setDateValue] = useState(dayId)
  const [savingDate, setSavingDate] = useState(false)

  useEffect(() => {
    setDateValue(dayId)
  }, [dayId])

  const file = getGoodsReceivedDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const hasData = hasGoodsReceivedDataForDay(projectId, dayId)
  const lines = getGoodsReceivedDashboardLinesForDay(projectId, dayId)
  const acquiredTotals = getGoodsAcquiredDayTotals(projectId, dayId)

  async function handleDateChange(event) {
    const nextDayId = event.target.value
    setDateValue(nextDayId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDayId) || nextDayId === dayId || savingDate) return

    setSavingDate(true)
    try {
      const result = await renameGoodsReceivedDailyFile(projectId, dayId, nextDayId)
      if (!result.ok) {
        window.alert(result.message || "Could not change the file date.")
        setDateValue(dayId)
        return
      }
      refresh()
      router.replace(getGoodsReceivedDailyFileHref(projectId, nextDayId))
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
          href={getGoodsReceivedDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily fuel received
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Description, unit, quantity, total cost, and fuel left
          roll up from the fuel received entry. Matching descriptions are combined. Fuel
          left = fuel requested − fuel received. These quantities also roll into fuel
          on site and fuel analysis.
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

      <AcquiredGoodsBalanceHeading
        totalQuantity={acquiredTotals.totalQuantity}
        totalCost={acquiredTotals.totalCost}
        periodLabel={dayLabel}
      />

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Fuel received table</h2>
          <Link
            href={getGoodsReceivedEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="package" size={16} />
            {hasData ? "Edit entry" : "Fuel received entry"}
          </Link>
        </div>

        <GoodsReceivedDashboardTable
          lines={lines}
          emptyMessage="No fuel received yet. Open Fuel received entry to add items."
        />
      </section>
    </div>
  )
}
