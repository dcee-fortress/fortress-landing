"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import {
  getCeoDashboardsHref,
  getMaterialAnalysisHref,
  getMaterialSiteProjectHref,
} from "@/lib/projectRoutes"

function getMaterialsOverviewItems(projectId) {
  return [
    {
      key: "analysis",
      label: "Material analysis",
      description: "Read-only project to date of material requested, received, and the balance left",
      icon: "chart-bar",
      href: getMaterialAnalysisHref(projectId),
    },
    {
      key: "on-site",
      label: "Project to date material on site",
      description: "Storeroom quantities, material used, and material left for the whole project",
      icon: "package",
      href: getMaterialSiteProjectHref(projectId),
    },
  ]
}

export default function CeoMaterialsOverviewPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell space-y-6">
            <header className="space-y-2">
              <Link
                href={getCeoDashboardsHref(projectId)}
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
              >
                <Icon name="arrow-left" size={16} />
                Back to CEO EXCLUSIVE
              </Link>
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Materials overview
              </p>
              <h1
                suppressHydrationWarning
                className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
              >
                {project.name || "Project"}
              </h1>
              <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
                Open material analysis or the project to date material on site dashboard.
              </p>
            </header>

            <div className="app-choice-grid">
              {getMaterialsOverviewItems(projectId).map((item) => (
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
        </div>
      )}
    </ProjectPageClientShell>
  )
}
