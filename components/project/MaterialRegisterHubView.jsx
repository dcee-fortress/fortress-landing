"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { getMaterialRegister } from "@/lib/materialRegister"
import {
  getMaterialRegisterPeriodHref,
  getSiteMaterialScheduleHref,
} from "@/lib/projectRoutes"

export default function MaterialRegisterHubView({ projectId, projectName, kind }) {
  const register = getMaterialRegister(kind)

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
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{register.title}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{register.hubDescription}</p>
      </header>

      <div className="app-choice-grid">
        <ChoiceCard
          href={getMaterialRegisterPeriodHref(projectId, kind, "project-to-date")}
          icon="hard-hat"
          title="Project to date"
          description={`${register.title} totals rolled up from the daily files. ${register.rollupNote}`}
          prefetch={false}
        />
        <ChoiceCard
          href={getMaterialRegisterPeriodHref(projectId, kind, "daily")}
          icon="clock"
          title={register.dailyTitle}
          description="Press + to create a daily file, then set its date inside the file"
          prefetch={false}
        />
      </div>
    </div>
  )
}
