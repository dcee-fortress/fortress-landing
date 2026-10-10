"use client"

import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import {
  CEO_DASHBOARD_REMEMBER_KEY,
  isCeoDashboardRemembered,
  unlockCeoDashboard,
  validateCeoDashboardCredentials,
} from "@/lib/ceoDashboardAuth"

export default function CeoDashboardsGate({ children }) {
  return (
    <RestrictedAreaGate
      title="CEO EXCLUSIVE"
      description="Enter the CEO EXCLUSIVE username and password. Without saving, you will be asked again next time."
      validateCredentials={validateCeoDashboardCredentials}
      unlock={unlockCeoDashboard}
      isRemembered={isCeoDashboardRemembered}
      rememberKey={CEO_DASHBOARD_REMEMBER_KEY}
      tone="gold"
    >
      {children}
    </RestrictedAreaGate>
  )
}
