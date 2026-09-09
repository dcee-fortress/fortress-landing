"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
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
            href={getDashboardHref(projectId, item.view)}
            icon={item.icon}
            title={item.label}
            description={item.description}
          />
        ))}
      </div>
    </div>
  )
}
