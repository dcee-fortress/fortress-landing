import HomeMenu from "@/components/project/HomeMenu"
import { getProjectForRoute, isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectHomePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  const project = getProjectForRoute(projectId)
  if (!project) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <HomeMenu projectId={projectId} />
    </div>
  )
}
