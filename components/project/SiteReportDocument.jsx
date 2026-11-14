"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import WorkingHoursWeatherCard from "@/components/project/WorkingHoursWeatherCard"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { formatCurrency } from "@/lib/formatCurrency"
import {
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueRowRate,
  resolveEarnedValueTotalRate,
  EARNED_VALUE_TABLE_HEADERS,
} from "@/lib/earnedValueTable"
import { getDaySummary, getMonthSummary, getWeekSummary } from "@/lib/projectData"
import { getMaterialOnSiteRows } from "@/lib/materialOnSite"
import { getEquipmentInUseReport } from "@/lib/equipmentInUse"
import { getGoodsReceivedDashboardLinesForDayIds } from "@/lib/goodsReceived"
import { formatMaterialAmount } from "@/lib/plantCostCalculations"
import { getSiteReportPeriodHref } from "@/lib/projectRoutes"
import { getSiteReportDayIds, getSiteReportIncidents } from "@/lib/siteReports"

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function hoursText(value) {
  if (value === null || value === undefined || value === "") return "—"
  const number = Number(value)
  if (!Number.isFinite(number)) return "—"
  return number.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function quantityText(amount, unit) {
  const formatted = formatMaterialAmount(amount)
  return unit ? `${formatted} ${unit}` : formatted
}

function SheetTable({ headers, rows, empty }) {
  if (!rows.length) {
    return <p className="text-sm text-zinc-500">{empty}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header.label}
                className={`border border-zinc-800 bg-zinc-100 px-3 py-2 font-semibold text-zinc-900 ${
                  header.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.key}-${index}`}
                  className={`border border-zinc-400 px-3 py-2 align-top text-zinc-900 ${
                    headers[index]?.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="mt-8">
      <h3 className="text-base font-bold text-zinc-900">{title}</h3>
      {note ? <p className="mb-3 mt-1 text-sm text-zinc-600">{note}</p> : <div className="mb-3" />}
      {children}
    </section>
  )
}

export default function SiteReportDocument({ projectId, projectName, period, file }) {
  const { version } = useProjectData()

  const report = useMemo(() => {
    void version
    const dayIds = getSiteReportDayIds(projectId, period, file.id)
    const summary =
      period === "weekly"
        ? getWeekSummary(projectId, file.id)
        : period === "monthly"
          ? getMonthSummary(projectId, file.id)
          : getDaySummary(projectId, file.id)

    return {
      summary: summary || { rows: [], totals: { valueEarned: 0, production: 0 } },
      materials: getMaterialOnSiteRows(projectId, dayIds),
      equipment: getEquipmentInUseReport(projectId, period, file.id),
      fuel: getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds),
      incidents: getSiteReportIncidents(projectId, dayIds),
    }
  }, [projectId, period, file.id, version])

  const valuationRows = report.summary.rows || []
  const totals = report.summary.totals || { valueEarned: 0, production: 0 }
  const totalRate = resolveEarnedValueTotalRate(totals)
  const periodWord = period === "weekly" ? "week" : period === "monthly" ? "month" : "day"

  return (
    <div className="space-y-6">
      <div className="no-print space-y-2">
        <Link
          href={getSiteReportPeriodHref(projectId, period)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {periodWord} files
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Site reports</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{file.label}</h1>
        </header>
      </div>

      {period === "daily" ? (
        <WorkingHoursWeatherCard projectName={projectName} reportType="daily" reportId={file.id} />
      ) : null}

      <article
        className="mx-auto w-full max-w-[880px] border border-zinc-300 bg-white px-6 py-10 text-zinc-900 shadow-md sm:px-12"
        style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
      >
        <header className="border-b border-zinc-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{projectName}</p>
          <h2 className="mt-1 text-3xl font-bold">{file.label}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Site report for this {periodWord}. Figures roll from the same entries as the progress report.
          </p>
        </header>

        <Section
          title="Valuations"
          note="Rolled from the valuations entry for this period."
        >
          {valuationRows.length === 0 ? (
            <p className="text-sm text-zinc-500">No valuations entry for this {periodWord}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    {EARNED_VALUE_TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className={`border border-zinc-800 bg-zinc-100 px-3 py-2 font-semibold ${
                          header === "Description" ? "text-left" : "text-right"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {valuationRows.map((row) => (
                    <tr key={row.id || row.description}>
                      <td className="border border-zinc-400 px-3 py-2">{row.description}</td>
                      <td className="border border-zinc-400 px-3 py-2 text-right">
                        {formatCurrency(row.valueEarned)}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2 text-right">
                        {formatEarnedValueProduction(row.production)}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2 text-right">
                        {formatEarnedValueRate(resolveEarnedValueRowRate(row))}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="border border-zinc-800 px-3 py-2">Total</td>
                    <td className="border border-zinc-800 px-3 py-2 text-right">
                      {formatCurrency(totals.valueEarned)}
                    </td>
                    <td className="border border-zinc-800 px-3 py-2 text-right">
                      {formatEarnedValueProduction(totals.production)}
                    </td>
                    <td className="border border-zinc-800 px-3 py-2 text-right">
                      {formatEarnedValueRate(totalRate)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Materials on site" note="Rolled from materials on site for this period.">
          <SheetTable
            headers={[
              { label: "Description of good" },
              { label: "Goods on site", align: "right" },
              { label: "Goods used on site", align: "right" },
              { label: "Location used" },
              { label: "Goods left on site", align: "right" },
            ]}
            empty={`No materials on site for this ${periodWord}.`}
            rows={report.materials.map((row) => ({
              key: row.key,
              cells: [
                row.description,
                quantityText(row.goodsOnSite, row.unit),
                quantityText(row.goodsUsed, row.unit),
                row.location || "—",
                quantityText(row.goodsLeft, row.unit),
              ],
            }))}
          />
        </Section>

        <Section
          title="Equipment in use"
          note="Equipment name, operator, and the hours written on daily equipment in use."
        >
          <SheetTable
            headers={[
              { label: "Equipment" },
              { label: "Operator" },
              { label: "Hours", align: "right" },
            ]}
            empty={`No equipment in use for this ${periodWord}.`}
            rows={(report.equipment?.equipment || []).map((item) => ({
              key: item.id || `${item.plant}-${item.operatorName}-${item.plantNumber}`,
              cells: [item.plant || "Equipment", item.operatorName || "—", hoursText(item.hoursOperating)],
            }))}
          />
        </Section>

        <Section title="Fuel allocations" note="Fuel consumed entered for this period.">
          <SheetTable
            headers={[
              { label: "Fuel" },
              { label: "Unit" },
              { label: "Quantity consumed", align: "right" },
              { label: "Total cost", align: "right" },
            ]}
            empty={`No fuel consumed for this ${periodWord}.`}
            rows={(report.fuel || []).map((line) => ({
              key: line.id || line.description,
              cells: [
                line.description,
                line.unit || "—",
                formatMaterialAmount(line.quantity),
                money(line.totalCost),
              ],
            }))}
          />
        </Section>

        <Section title="Incidents" note="Rolled from the SHEQ incident report.">
          <SheetTable
            headers={[
              { label: "Date" },
              { label: "Type" },
              { label: "Person" },
              { label: "Location" },
              { label: "Description" },
            ]}
            empty={`No incidents for this ${periodWord}.`}
            rows={report.incidents.map((incident) => ({
              key: incident.id,
              cells: [
                incident.dateLabel,
                incident.type,
                incident.person || "—",
                incident.location || "—",
                incident.description || "—",
              ],
            }))}
          />
        </Section>
      </article>
    </div>
  )
}
