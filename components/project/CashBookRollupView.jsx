"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import CashBookDashboardTable from "@/components/project/CashBookDashboardTable"
import CumulativePeriodNote from "@/components/project/CumulativePeriodNote"
import DashboardSearch, { useDashboardSearch } from "@/components/project/DashboardSearch"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getCashBook } from "@/lib/cashBooks"
import { formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"
import { getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { getCashBookDailyFileHref, getCashBookHref } from "@/lib/projectRoutes"

const SEARCH_ROW_ID_PREFIX = "cash-book-row"

function getCashLineSearchText(line) {
  return [
    line.description,
    formatMaterialCurrencyAmount(line.cashReceived),
    formatMaterialCurrencyAmount(line.amountPaid),
    formatMaterialCurrencyAmount(line.cashBalance),
    String(line.cashReceived ?? ""),
    String(line.amountPaid ?? ""),
  ].join(" ")
}

function getCashLineDetails(line) {
  return [
    { label: "Cash received", value: formatMaterialCurrencyAmount(line.cashReceived) },
    { label: "Amount paid", value: formatMaterialCurrencyAmount(line.amountPaid) },
    { label: "Cash balance", value: formatMaterialCurrencyAmount(line.cashBalance) },
  ]
}

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

export default function CashBookRollupView({
  projectId,
  projectName,
  bookId,
  title,
  description,
  mode,
  backHref,
  backLabel,
  exportable = false,
  children,
}) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version
  const book = getCashBook(bookId)

  const periods = useMemo(() => {
    if (!hasHydrated) return []
    const data = book.data

    if (mode === "project-to-date") {
      const totals = data.getProjectTotals(projectId)
      const dayIds = data.getDayIds(projectId)
      return [
        {
          id: "project-to-date",
          label: "Project to date",
          totals,
          lines: data.getDashboardLinesForDayIds(projectId, dayIds),
          dayIds,
        },
      ]
    }

    if (mode === "weekly") {
      return getWeeklyFiles(projectId).map((file) => {
        const dayIds = data.getDayIdsInWeek(projectId, file.id)
        return {
          id: file.id,
          label: file.label,
          totals: data.getTotalsForDayIds(projectId, dayIds),
          lines: data.getDashboardLinesForDayIds(projectId, dayIds),
          dayIds,
        }
      })
    }

    return getMonthlyFiles(projectId).map((file) => {
      const dayIds = data.getDayIdsInMonth(projectId, file.id)
      return {
        id: file.id,
        label: file.label,
        totals: data.getTotalsForDayIds(projectId, dayIds),
        lines: data.getDashboardLinesForDayIds(projectId, dayIds),
        dayIds,
      }
    })
  }, [book, hasHydrated, mode, projectId, version])

  const searchable = mode === "project-to-date"
  const searchLines = searchable ? (periods[0]?.lines ?? []) : []
  const search = useDashboardSearch({
    rows: searchLines,
    getSearchText: getCashLineSearchText,
    rowIdPrefix: SEARCH_ROW_ID_PREFIX,
    panelId: "cash-book-search",
  })

  const exportPeriod = exportable && mode === "project-to-date" ? periods[0] : null

  async function exportToPdf() {
    if (!exportPeriod) return
    const { exportCashBookProjectToDatePdf } = await import("@/lib/ceoReportPdf")
    exportCashBookProjectToDatePdf({
      projectName: projectName || "Project",
      title,
      bookLabel: book.label,
      reportDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      totals: exportPeriod.totals,
      lines: exportPeriod.lines,
      dayCount: exportPeriod.dayIds.length,
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={backHref ?? getCashBookHref(projectId, book.id)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          {backLabel ?? `Back to ${book.label}`}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</p>
            <h1
              suppressHydrationWarning
              className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
            >
              {projectName || "Project"}
            </h1>
          </div>
          {exportPeriod ? <ExportPdfButton onClick={exportToPdf} /> : null}
        </div>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{description}</p>
        {mode === "project-to-date" ? <CumulativePeriodNote projectId={projectId} /> : null}
      </header>

      {children}

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
                    {period.dayIds.length === 1 ? "" : "s"} with {book.name} entries. Cash balance
                    is the sum of each day&apos;s balance; same descriptions add up.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <TotalsGrid totals={period.totals} />
              </div>
              {searchable && period.lines.length > 0 ? (
                <DashboardSearch
                  search={search}
                  rows={searchLines}
                  placeholder="Search transaction description or amount…"
                  ariaLabel={`Search the ${book.name} dashboard`}
                  noMatchLabel="No transaction matches"
                  getDetails={getCashLineDetails}
                  className="mt-5"
                />
              ) : null}
              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                <CashBookDashboardTable
                  lines={period.lines}
                  emptyMessage={`No ${book.name} entries in this period yet.`}
                  rowIdPrefix={searchable ? SEARCH_ROW_ID_PREFIX : undefined}
                  highlightedRowIndex={searchable ? search.highlightedIndex : null}
                />
              </div>
              {period.dayIds.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {period.dayIds.map((dayId) => (
                    <li key={dayId}>
                      <Link
                        href={getCashBookDailyFileHref(projectId, book.id, dayId)}
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
