"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  getGoodsAcquiredHref,
  getGoodsAnalysisHref,
  getGoodsReceivedHref,
  getMaterialOnSiteHref,
  getQsEngineeringHref,
} from "@/lib/projectRoutes"

const MATERIAL_SCHEDULE_MODULES = [
  {
    key: "requested",
    href: getGoodsAcquiredHref,
    icon: "package",
    title: "Material requested",
    description: "Daily, weekly, and project to date material requested, with the same entry as before",
  },
  {
    key: "received",
    href: getGoodsReceivedHref,
    icon: "package",
    title: "Material received",
    description: "Daily, weekly, and project to date material received, with entry on the daily dashboard",
  },
  {
    key: "on-site",
    href: getMaterialOnSiteHref,
    icon: "table",
    title: "Material on site",
    description: "Daily, weekly, monthly, and project to date material on site",
  },
  {
    key: "analysis",
    href: getGoodsAnalysisHref,
    icon: "chart-bar",
    title: "Material analysis",
    description: "Material left and the cost of material left from material requested and material received",
  },
]

export default function MaterialSchedulesView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsEngineeringHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Quantity Survey
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Material schedule
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open material requested, material received, material on site, or material analysis.
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
