"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { QS_ENGINEERING_MODULES, getDashboardHref, getProjectHomeHref } from "@/lib/projectRoutes"

export default function QsEngineeringView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getProjectHomeHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to project home
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">QS &amp; Engineering</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open valuations, plant on site, progress reports, and rate analysis for this project.
        </p>
      </header>

      <div className="app-choice-grid">
        {QS_ENGINEERING_MODULES.map((item) => (
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
