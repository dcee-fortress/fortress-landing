"use client"

import Link from "next/link"
import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import {
  getQsOverviewHref,
  getQsOverviewPeriodHref,
  QS_OVERVIEW_PERIODS,
} from "@/lib/qsOverview"

export default function QsMarginTableView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsOverviewHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Head QS Overview
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Rate Analysis</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open a period dashboard rolled from valuations entry.
        </p>
      </header>

      <div className="app-choice-grid">
        {QS_OVERVIEW_PERIODS.map((item) => (
          <ChoiceCard
            key={item.period}
            href={getQsOverviewPeriodHref(projectId, item.period)}
            icon={item.icon}
            title={item.label}
            description={item.description}
          />
        ))}
      </div>
    </div>
  )
}
