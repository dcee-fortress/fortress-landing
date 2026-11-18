"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  getMaterialSiteDailyHref,
  getMaterialSiteProjectHref,
  getSiteMaterialScheduleHref,
} from "@/lib/projectRoutes"

export default function MaterialSiteHubView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSiteMaterialScheduleHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Material schedule
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Material on site</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Daily material on site files are created automatically. Leftover stock rolls to the next
          day. Enter material used and material left is on site minus used.
        </p>
      </header>

      <div className="app-choice-grid">
        <ChoiceCard
          href={getMaterialSiteProjectHref(projectId)}
          icon="hard-hat"
          title="Project to date"
          description="Storeroom quantities, material used, and material left for the whole project. Similar descriptions are one line."
          prefetch={false}
        />
        <ChoiceCard
          href={getMaterialSiteDailyHref(projectId)}
          icon="clock"
          title="Daily material on site"
          description="Automatic daily files. Yesterday’s left rolls forward; enter used to see what is left."
          prefetch={false}
        />
      </div>
    </div>
  )
}
