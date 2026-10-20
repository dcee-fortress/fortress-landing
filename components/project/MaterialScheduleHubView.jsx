"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { bulkMaterialRequest, materialReceipts } from "@/lib/materialRegister"
import {
  getMaterialAnalysisHref,
  getMaterialRegisterHref,
  getMaterialSiteHref,
  getQsSchedulesHref,
} from "@/lib/projectRoutes"

const MODULES = [bulkMaterialRequest, materialReceipts]

export default function MaterialScheduleHubView({ projectId, projectName }) {
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
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Material schedule</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open bulk material request, material received, material on site, or material analysis.
        </p>
      </header>

      <div className="app-choice-grid">
        {MODULES.map((item) => (
          <ChoiceCard
            key={item.id}
            href={getMaterialRegisterHref(projectId, item.id)}
            icon={item.id === "received" ? "package-check" : "clipboard-list"}
            title={item.title}
            description={item.hubDescription}
            prefetch={false}
          />
        ))}
        <ChoiceCard
          href={getMaterialSiteHref(projectId)}
          icon="warehouse"
          title="Material on site"
          description="Edit material brought on site and material used. Material left is brought on site minus material used."
          prefetch={false}
        />
        <ChoiceCard
          href={getMaterialAnalysisHref(projectId)}
          icon="chart-bar"
          title="Material analysis"
          description="Read-only project to date of material requested, material received, and the balance left."
          prefetch={false}
        />
      </div>
    </div>
  )
}
