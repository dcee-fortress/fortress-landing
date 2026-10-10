"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import CumulativePeriodNote from "@/components/project/CumulativePeriodNote"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import { getCeoDashboardsHref, getCeoGoodsOverviewHref } from "@/lib/projectRoutes"

function getGoodsOverviewItems(projectId) {
  const root = getCeoGoodsOverviewHref(projectId)
  return [
    {
      key: "ordered",
      label: "Ordered",
      description: "Cumulative quantity and cost of each good requested",
      icon: "list-ordered",
      href: `${root}/ordered`,
    },
    {
      key: "received",
      label: "Received",
      description: "Cumulative quantity and cost of each good received",
      icon: "truck",
      href: `${root}/received`,
    },
    {
      key: "pending",
      label: "Pending",
      description: "Ordered minus received, for quantity and cost of each good",
      icon: "package",
      href: `${root}/pending`,
    },
  ]
}

export default function CeoGoodsOverviewPageClient({ projectId }) {
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
                Goods overview
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
                {project.name || "Project"}
              </h1>
              <CumulativePeriodNote projectId={projectId} />
            </header>

            <div className="app-choice-grid">
              {getGoodsOverviewItems(projectId).map((item) => (
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
