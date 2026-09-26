import PurchasesPageClient from "@/components/project/PurchasesPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PurchasesPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PurchasesPageClient projectId={projectId} />
}
