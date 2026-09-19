import FinancePageClient from "@/components/project/FinancePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function FinancePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <FinancePageClient projectId={projectId} />
}
