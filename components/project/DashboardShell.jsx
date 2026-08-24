import ProjectMenu from "@/components/project/ProjectMenu"

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-screen">
      <ProjectMenu />
      <div className="pt-[4.25rem]">{children}</div>
    </div>
  )
}
