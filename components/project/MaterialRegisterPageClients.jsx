"use client"

import { notFound } from "next/navigation"
import MaterialRegisterDayView from "@/components/project/MaterialRegisterDayView"
import MaterialRegisterDailyListView from "@/components/project/MaterialRegisterDailyListView"
import MaterialRegisterEntryView from "@/components/project/MaterialRegisterEntryView"
import MaterialRegisterHubView from "@/components/project/MaterialRegisterHubView"
import MaterialRegisterRollupView from "@/components/project/MaterialRegisterRollupView"
import MaterialScheduleHubView from "@/components/project/MaterialScheduleHubView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import {
  FINANCE_ENTRY_REMEMBER_KEY,
  isFinanceEntryRemembered,
  unlockFinanceEntry,
  validateFinanceEntryCredentials,
} from "@/lib/financeEntryAuth"
import { getMaterialRegister } from "@/lib/materialRegister"

function Frame({ children }) {
  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">{children}</div>
    </div>
  )
}

export function MaterialScheduleHubPageClient({ projectId }) {
  const { getProject } = useProjects()
  return (
    <Frame>
      <MaterialScheduleHubView projectId={projectId} projectName={getProject(projectId)?.name || ""} />
    </Frame>
  )
}

export function MaterialRegisterHubPageClient({ projectId, kind }) {
  const { getProject } = useProjects()
  return (
    <Frame>
      <MaterialRegisterHubView
        projectId={projectId}
        projectName={getProject(projectId)?.name || ""}
        kind={kind}
      />
    </Frame>
  )
}

export function MaterialRegisterDailyPageClient({ projectId, kind }) {
  const { getProject } = useProjects()
  return (
    <Frame>
      <MaterialRegisterDailyListView
        projectId={projectId}
        projectName={getProject(projectId)?.name || ""}
        kind={kind}
      />
    </Frame>
  )
}

export function MaterialRegisterRollupPageClient({ projectId, kind }) {
  const { getProject } = useProjects()
  return (
    <Frame>
      <MaterialRegisterRollupView
        projectId={projectId}
        projectName={getProject(projectId)?.name || ""}
        kind={kind}
      />
    </Frame>
  )
}

export function MaterialRegisterDayPageClient({ projectId, dayId, kind }) {
  const register = getMaterialRegister(kind)
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    register.getDailyFile(projectId, dayId)
  )

  if (!isReady || !file && !syncReady) return <PageLoadingShell />
  if (syncReady && !file) notFound()

  return (
    <Frame>
      <MaterialRegisterDayView
        projectId={projectId}
        projectName={project?.name || ""}
        dayId={dayId}
        kind={kind}
      />
    </Frame>
  )
}

export function MaterialRegisterEntryPageClient({ projectId, dayId, kind }) {
  const register = getMaterialRegister(kind)
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    register.getDailyFile(projectId, dayId)
  )

  if (!isReady || (!file && !syncReady)) return <PageLoadingShell />
  if (syncReady && !file) notFound()

  return (
    <RestrictedAreaGate
      title={register.entryTitle}
      description="Enter the finance username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validateFinanceEntryCredentials}
      unlock={unlockFinanceEntry}
      isRemembered={isFinanceEntryRemembered}
      rememberKey={FINANCE_ENTRY_REMEMBER_KEY}
    >
      <Frame>
        <MaterialRegisterEntryView
          projectId={projectId}
          projectName={project?.name || ""}
          dayId={dayId}
          kind={kind}
        />
      </Frame>
    </RestrictedAreaGate>
  )
}
