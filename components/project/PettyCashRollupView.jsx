"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { useProjects } from "@/components/project/ProjectsProvider"
import { formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"
import {
  getPettyCashDayIds,
  getPettyCashDayIdsInMonth,
  getPettyCashDayIdsInWeek,
  getPettyCashProjectTotals,
  getPettyCashTotalsForDayIds,
} from "@/lib/pettyCash"
import { getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { getPettyCashHref, getPettyCashDailyFileHref } from "@/lib/projectRoutes"

function TotalsGrid({ totals }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-zinc-50 px-4 py-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Cash received</dt>
        <dd className="mt-1 text-lg font-semibold text-zinc-900">
          {formatMaterialCurrencyAmount(totals.cashReceived)}
        </dd>
      </div>
      <div className="rounded-xl bg-zinc-50 px-4 py-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Amount paid</dt>
        <dd className="mt-1 text-lg font-semibold text-zinc-900">
          {formatMaterialCurrencyAmount(totals.amountPaid)}
        </dd>
      </div>
      <div className="rounded-xl bg-zinc-50 px-4 py-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Cash balance</dt>
        <dd className="mt-1 text-lg font-semibold text-zinc-900">
          {formatMaterialCurrencyAmount(totals.closingBalance)}
        </dd>
      </div>
    </dl>
  )
}

export default function PettyCashRollupView({
  projectId,
  projectName,
  title,
  description,
  mode,
}) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version

  const periods = useMemo(() => {
    if (!hasHydrated) return []

    if (mode === "project-to-date") {
      const totals = getPettyCashProjectTotals(projectId)
      const dayIds = getPettyCashDayIds(projectId)
      return [
        {
          id: "project-to-date",
          label: "Project to date",
          totals,
          dayIds,
        },
      ]
    }

    if (mode === "weekly") {
      return getWeeklyFiles(projectId).map((file) => {
        const dayIds = getPettyCashDayIdsInWeek(projectId, file.id)
        return {
          id: file.id,
          label: file.label,
          totals: getPettyCashTotalsForDayIds(projectId, dayIds),
          dayIds,
        }
      })
    }

    return getMonthlyFiles(projectId).map((file) => {
      const dayIds = getPettyCashDayIdsInMonth(projectId, file.id)
      return {
        id: file.id,
        label: file.label,
        totals: getPettyCashTotalsForDayIds(projectId, dayIds),
        dayIds,
      }
    })
  }, [hasHydrated, mode, projectId, version])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPettyCashHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Petty cash
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{description}</p>
      </header>

      {!hasHydrated ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => (
            <section
              key={period.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{period.label}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Rolled up from {period.dayIds.length} daily file
                    {period.dayIds.length === 1 ? "" : "s"} with petty cash entries.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <TotalsGrid totals={period.totals} />
              </div>
              {period.dayIds.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {period.dayIds.map((dayId) => (
                    <li key={dayId}>
                      <Link
                        href={getPettyCashDailyFileHref(projectId, dayId)}
                        className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200"
                      >
                        {dayId}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
