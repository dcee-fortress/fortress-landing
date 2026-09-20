import InductionRegisterPageClient from "@/components/project/InductionRegisterPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function InductionRegisterPage({ params }) {
  const { projectId, monthId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <InductionRegisterPageClient projectId={projectId} monthId={monthId} />
}
