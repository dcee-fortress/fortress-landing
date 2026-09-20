"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { PPE_REGISTERS_OPTIONS, getSafetyHealthHref } from "@/lib/projectRoutes"

export default function PpeRegistersView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSafetyHealthHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Safety & Health
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">PPE registers</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open Site Staff attendance or Induction register to manage monthly register files.
        </p>
      </header>

      <div className="app-choice-grid">
        {PPE_REGISTERS_OPTIONS.map((item) => (
          <ChoiceCard
            key={item.key}
            href={item.href(projectId)}
            icon={item.icon}
            title={item.label}
            description={item.description}
            iconClassName="app-icon-tile--blue"
            prefetch={false}
          />
        ))}
      </div>
    </div>
  )
}
