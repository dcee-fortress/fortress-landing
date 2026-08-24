"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { getDashboardHref } from "@/lib/projectRoutes"

const VALUATION_OPTIONS = [
  {
    view: "project-to-date",
    label: "Project to date valuations",
    description: "Main activity, actual cost on site, and production totals",
    icon: "hard-hat",
  },
  {
    view: "monthly-value",
    label: "Monthly valuations",
    description: "Completed monthly valuation reports from project start",
    icon: "calendar-days",
  },
  {
    view: "weekly-value",
    label: "Weekly valuations",
    description: "Completed weekly valuation reports in 7-day periods",
    icon: "calendar-range",
  },
  {
    view: "daily-value",
    label: "Daily valuations",
    description: "Completed daily valuation reports from project start",
    icon: "clock",
  },
]

export default function ValuationsView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Valuations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {projectName}
        </h1>
        <p className="max-w-2xl text-zinc-500">
          Choose an earned value dashboard to view project performance over time.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {VALUATION_OPTIONS.map((item) => (
          <Link
            key={item.view}
            href={getDashboardHref(projectId, item.view)}
            prefetch={false}
            className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 transition group-hover:bg-zinc-200">
              <Icon name={item.icon} size={22} className="text-zinc-700" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-zinc-900">{item.label}</h2>
              <p className="text-sm leading-relaxed text-zinc-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
