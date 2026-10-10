"use client"

import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import SettingsPanel from "@/components/project/SettingsPanel"
import {
  CEO_DASHBOARD_REMEMBER_KEY,
  isCeoDashboardRemembered,
  unlockCeoDashboard,
  validateCeoDashboardCredentials,
} from "@/lib/ceoDashboardAuth"

export default function SettingsPage() {
  return (
    <RestrictedAreaGate
      title="Settings"
      description="Enter the CEO EXCLUSIVE username and password to open Settings."
      validateCredentials={validateCeoDashboardCredentials}
      unlock={unlockCeoDashboard}
      isRemembered={isCeoDashboardRemembered}
      rememberKey={CEO_DASHBOARD_REMEMBER_KEY}
    >
      <div className="app-page-frame text-zinc-900">
        <SettingsPanel />
      </div>
    </RestrictedAreaGate>
  )
}
