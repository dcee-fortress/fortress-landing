"use client"

import CashBookRollupView from "@/components/project/CashBookRollupView"
import CeoFilesToggle from "@/components/project/CeoFilesToggle"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import { getCashBook } from "@/lib/cashBooks"
import { getCashBookPeriodHref, getCashBookPeriods, getCeoDashboardsHref } from "@/lib/projectRoutes"

export default function CeoCashBookPageClient({ projectId, bookId, title }) {
  const book = getCashBook(bookId)
  const fileItems = getCashBookPeriods(book.name)
    .filter((item) => item.period !== "project-to-date")
    .map((item) => ({
      key: item.period,
      href: getCashBookPeriodHref(projectId, bookId, item.period),
      icon: item.icon,
      title: item.label,
      description: item.description,
    }))

  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <CashBookRollupView
              projectId={projectId}
              projectName={project.name}
              bookId={bookId}
              title={title}
              description={`${book.label} totals for the whole project, rolled up from daily entries.`}
              mode="project-to-date"
              backHref={getCeoDashboardsHref(projectId)}
              backLabel="Back to CEO EXCLUSIVE"
              exportable
            >
              <CeoFilesToggle
                icon="banknote"
                title={book.label}
                description={`Open the daily, weekly and monthly ${book.name} files`}
                items={fileItems}
              />
            </CashBookRollupView>
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
