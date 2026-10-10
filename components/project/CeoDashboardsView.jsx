"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  getCeoCashBookHref,
  getCeoGoodsOverviewHref,
  getCeoWorkValuedHref,
  getCeoWorkersHref,
  getProjectHomeHref,
} from "@/lib/projectRoutes"

function getCeoDashboardItems(projectId) {
  return [
    {
      key: "petty-cash",
      label: "Total petty cash spent",
      description: "Petty cash paid out for the project to date",
      icon: "banknote",
      href: getCeoCashBookHref(projectId, "petty-cash"),
    },
    {
      key: "food-cash",
      label: "Total food and catering cost",
      description: "Food cash paid out for the project to date",
      icon: "utensils",
      href: getCeoCashBookHref(projectId, "food-cash"),
    },
    {
      key: "work-valued",
      label: "Total work valued",
      description: "Project to date activities, cost, production and rate",
      icon: "hard-hat",
      href: getCeoWorkValuedHref(projectId),
    },
    {
      key: "workers",
      label: "Total number of workers",
      description: "Workers on site, admin members and registers",
      icon: "users",
      href: getCeoWorkersHref(projectId),
    },
    {
      key: "goods-overview",
      label: "Goods overview",
      description: "Ordered, received and pending goods for the project to date",
      icon: "package",
      href: getCeoGoodsOverviewHref(projectId),
    },
  ]
}

export default function CeoDashboardsView({ projectId, projectName }) {
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
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">CEO EXCLUSIVE</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Executive overview of project performance.
        </p>
      </header>

      <div className="app-choice-grid">
        {getCeoDashboardItems(projectId).map((item) => (
          <ChoiceCard
            key={item.key}
            href={item.href}
            icon={item.icon}
            title={item.label}
            description={item.description}
            iconClassName="app-icon-tile--ceo"
            className="app-choice-card--ceo-simple"
            prefetch={false}
          />
        ))}
      </div>
    </div>
  )
}
