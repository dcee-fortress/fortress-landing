import CashBookRollupPageClient from "@/components/project/CashBookRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDatePettyCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <CashBookRollupPageClient
      projectId={projectId}
      bookId="petty-cash"
      title="Project to date"
      description="Petty cash totals for the whole project, rolled up from daily entries."
      mode="project-to-date"
    />
  )
}
