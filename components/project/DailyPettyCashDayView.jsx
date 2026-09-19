"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import {
  formatMaterialCurrencyAmount,
} from "@/lib/plantCostCalculations"
import { getPettyCashDayTotals, hasPettyCashDataForDay } from "@/lib/pettyCash"
import {
  getPettyCashDailyHref,
  getPettyCashEntryHref,
} from "@/lib/projectRoutes"
import { getDailyFile } from "@/lib/projectFiles"
import { useProjects } from "@/components/project/ProjectsProvider"

export default function DailyPettyCashDayView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  void version

  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const hasData = hasPettyCashDataForDay(projectId, dayId)
  const totals = getPettyCashDayTotals(projectId, dayId)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPettyCashDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily petty cash dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">{projectName || "Project"}</p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Daily total</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Totals from the petty cash entry table for this day.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              hasData
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-sky-50 text-sky-800 ring-sky-200"
            }`}
          >
            {hasData ? "Saved" : "Awaiting entry"}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Cash received
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMaterialCurrencyAmount(totals.cashReceived)}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Amount paid
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMaterialCurrencyAmount(totals.amountPaid)}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Cash balance
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMaterialCurrencyAmount(totals.closingBalance)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Petty cash entry</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Open the entry table to add transactions for this day. Weekly, monthly, and project to date
          dashboards update from these daily entries.
        </p>
        <Link
          href={getPettyCashEntryHref(projectId, dayId)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Icon name="banknote" size={18} />
          Petty cash entry
        </Link>
      </section>
    </div>
  )
}
