import GrovePersistenceInit from "@/components/project/GrovePersistenceInit"
import { ProjectDataProvider } from "@/components/project/ProjectDataProvider"

export default function ProjectDashboardLayout({ children }) {
  return (
    <ProjectDataProvider>
      <GrovePersistenceInit />
      {children}
    </ProjectDataProvider>
  )
}
