"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  SHEQ_SITE_INSPECTION_PERIOD_OPTIONS,
  getSafetyReportsHref,
  getSheqSiteInspectionPeriodHref,
} from "@/lib/projectRoutes"

export default function SheqSiteInspectionView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSafetyReportsHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Safety reports
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          SHEQ site inspection report
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Choose daily, weekly, or monthly inspection files to enter observations and recommendations.
        </p>
      </header>

      <div className="app-choice-grid">
        {SHEQ_SITE_INSPECTION_PERIOD_OPTIONS.map((item) => (
          <ChoiceCard
            key={item.period}
            href={getSheqSiteInspectionPeriodHref(projectId, item.period)}
            icon={item.icon}
            title={item.label}
            description={item.description}
            prefetch={false}
          />
        ))}
      </div>
    </div>
  )
}
