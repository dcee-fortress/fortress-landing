"use client"

import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import SettingsPanel from "@/components/project/SettingsPanel"

export default function SettingsPage() {
  return (
    <RestrictedAreaGate title="Settings">
      <div className="app-page-frame text-zinc-900">
        <SettingsPanel />
      </div>
    </RestrictedAreaGate>
  )
}
