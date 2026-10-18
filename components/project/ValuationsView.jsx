"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import { getDashboardHref, getValuationsProjectToDateHref } from "@/lib/projectRoutes"

const VALUATION_OPTIONS = [
  {
    view: "project-to-date",
    label: "Project to date",
    description: "Cumulative cost, production, and rate from the project start, with search",
    icon: "hard-hat",
    href: getValuationsProjectToDateHref,
  },
  {
    view: "monthly-value",
    label: "Monthly valuations",
    description: "Completed monthly valuation reports from project start",
    icon: "calendar-days",
    href: (projectId) => getDashboardHref(projectId, "monthly-value"),
  },
  {
    view: "weekly-value",
    label: "Weekly valuations",
    description: "Completed weekly valuation reports in 7-day periods",
    icon: "calendar-range",
    href: (projectId) => getDashboardHref(projectId, "weekly-value"),
  },
  {
    view: "daily-value",
    label: "Daily valuations",
    description: "Completed daily valuation reports from project start",
    icon: "clock",
    href: (projectId) => getDashboardHref(projectId, "daily-value"),
  },
]

export default function ValuationsView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Valuations
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Choose an earned value dashboard to view project performance over time.
        </p>
      </header>

      <div className="app-choice-grid">
        {VALUATION_OPTIONS.map((item) => (
          <ChoiceCard
            key={item.view}
            href={item.href(projectId)}
            icon={item.icon}
            title={item.label}
            description={item.description}
          />
        ))}
      </div>
    </div>
  )
}
