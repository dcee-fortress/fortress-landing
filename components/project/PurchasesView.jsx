"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { PURCHASES_MODULES, getDashboardHref, getFinanceHref } from "@/lib/projectRoutes"

export default function PurchasesView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getFinanceHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Finance
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Purchases</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open goods received or goods acquired for this project.
        </p>
      </header>

      <div className="app-choice-grid">
        {PURCHASES_MODULES.map((item) => (
          <ChoiceCard
            key={item.view}
            href={getDashboardHref(projectId, item.view)}
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
