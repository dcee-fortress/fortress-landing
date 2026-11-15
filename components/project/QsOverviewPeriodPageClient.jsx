"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import QsOverviewDashboardView from "@/components/project/QsOverviewDashboardView"
import QsOverviewPeriodFilesView from "@/components/project/QsOverviewPeriodFilesView"

export default function QsOverviewPeriodPageClient({ projectId, period, fileId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            {period === "project-to-date" || fileId ? (
              <QsOverviewDashboardView
                projectId={projectId}
                projectName={project.name}
                period={period}
                fileId={fileId || "project"}
                periodLabel={
                  period === "project-to-date"
                    ? "Project to date"
                    : period === "daily"
                      ? fileId
                      : period === "weekly"
                        ? `Week ${fileId}`
                        : `Month ${fileId}`
                }
              />
            ) : (
              <QsOverviewPeriodFilesView
                projectId={projectId}
                projectName={project.name}
                period={period}
              />
            )}
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
