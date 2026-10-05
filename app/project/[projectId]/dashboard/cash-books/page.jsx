import CashBooksPageClient from "@/components/project/CashBooksPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CashBooksPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CashBooksPageClient projectId={projectId} />
}
