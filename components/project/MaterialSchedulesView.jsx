"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  getGoodsAcquiredHref,
  getGoodsAnalysisHref,
  getGoodsReceivedHref,
  getMaterialOnSiteHref,
  getQsSchedulesHref,
} from "@/lib/projectRoutes"

const MATERIAL_SCHEDULE_MODULES = [
  {
    key: "requested",
    href: getGoodsAcquiredHref,
    icon: "package",
    title: "Fuel requested",
    description: "Project to date and daily fuel requested. Create a daily file with + and set its date inside the file",
  },
  {
    key: "received",
    href: getGoodsReceivedHref,
    icon: "package",
    title: "Fuel received",
    description: "Project to date and daily fuel received. Create a daily file with + and set its date inside the file",
  },
  {
    key: "on-site",
    href: getMaterialOnSiteHref,
    icon: "table",
    title: "Fuel on site",
    description: "Daily, weekly, monthly, and project to date fuel on site",
  },
  {
    key: "analysis",
    href: getGoodsAnalysisHref,
    icon: "chart-bar",
    title: "Fuel analysis",
    description: "Fuel left and the cost of fuel left from fuel requested and fuel received",
  },
]

export default function MaterialSchedulesView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsSchedulesHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to QS Schedules
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Fuel schedule
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open fuel requested, fuel received, fuel on site, or fuel analysis.
        </p>
      </header>

      <div className="app-choice-grid">
        {MATERIAL_SCHEDULE_MODULES.map((item) => (
          <ChoiceCard
            key={item.key}
            href={item.href(projectId)}
            icon={item.icon}
            title={item.title}
            description={item.description}
            prefetch={false}
          />
        ))}
      </div>
    </div>
  )
}
