import ProjectToDateView from "@/components/project/ProjectToDateView"

export default function ProjectDashboard({ view, projectName, dashboard }) {
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
      {view === "project-to-date" && (
        <ProjectToDateView projectName={projectName} dashboard={dashboard} />
      )}
    </div>
  )
}
