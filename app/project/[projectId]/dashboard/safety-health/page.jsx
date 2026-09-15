import DepartmentPlaceholderPageClient from "@/components/project/DepartmentPlaceholderPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SafetyHealthPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <DepartmentPlaceholderPageClient
      projectId={projectId}
      title="Safety & Health"
      description="Safety and health tools for this project will appear here when modules are added."
    />
  )
}
