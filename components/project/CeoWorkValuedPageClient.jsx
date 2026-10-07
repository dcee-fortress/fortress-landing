"use client"

import Icon from "@/components/icon/icon"
import CeoFilesToggle from "@/components/project/CeoFilesToggle"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import ProjectToDateReport from "@/components/project/ProjectToDateReport"
import Link from "next/link"
import {
  DASHBOARD_VIEWS,
  getCeoDashboardsHref,
  getDailyValueHref,
  getMonthlyValueHref,
  getWeeklyValueHref,
} from "@/lib/projectRoutes"

function getValuationFileItems(projectId) {
  return [
    { view: "daily-value", href: getDailyValueHref(projectId) },
    { view: "weekly-value", href: getWeeklyValueHref(projectId) },
    { view: "monthly-value", href: getMonthlyValueHref(projectId) },
  ].map(({ view, href }) => ({
    key: view,
    href,
    icon: DASHBOARD_VIEWS[view].icon,
    title: DASHBOARD_VIEWS[view].label,
    description: DASHBOARD_VIEWS[view].description,
  }))
}

export default function CeoWorkValuedPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell space-y-4">
            <Link
              href={getCeoDashboardsHref(projectId)}
              className="no-print inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to CEO EXCLUSIVE
            </Link>
            <ProjectToDateReport projectName={project.name}>
              <CeoFilesToggle
                icon="chart-bar"
                title="Valuations"
                description="Open the daily, weekly and monthly valuation files"
                items={getValuationFileItems(projectId)}
              />
            </ProjectToDateReport>
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
