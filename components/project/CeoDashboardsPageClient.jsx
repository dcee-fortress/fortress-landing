"use client"

import DepartmentPlaceholderPageClient from "@/components/project/DepartmentPlaceholderPageClient"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import {
  CEO_DASHBOARD_REMEMBER_KEY,
  isCeoDashboardRemembered,
  unlockCeoDashboard,
  validateCeoDashboardCredentials,
} from "@/lib/ceoDashboardAuth"

export default function CeoDashboardsPageClient({ projectId }) {
  return (
    <RestrictedAreaGate
      title="CEO EXCLUSIVE"
      description="Enter the master key username and password to open the CEO dashboards. Without saving, you will be asked again next time."
      validateCredentials={validateCeoDashboardCredentials}
      unlock={unlockCeoDashboard}
      isRemembered={isCeoDashboardRemembered}
      rememberKey={CEO_DASHBOARD_REMEMBER_KEY}
      tone="gold"
    >
      <DepartmentPlaceholderPageClient
        projectId={projectId}
        title="CEO EXCLUSIVE"
        description="Executive overview of project performance."
      />
    </RestrictedAreaGate>
  )
}
