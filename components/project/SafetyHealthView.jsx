"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import { getPersonalProtectiveEquipmentHref } from "@/lib/projectRoutes"
import { getSiteStaffRegistersHref } from "@/lib/siteStaffRegisters"

const SAFETY_HEALTH_OPTIONS = [
  {
    key: "site-staff",
    label: "Site Staff attendance register",
    description:
      "Monthly attendance for site staff — name, role, and day boxes for present or absent",
    icon: "users",
    href: getSiteStaffRegistersHref,
  },
  {
    key: "ppe",
    label: "Personal protective equipment",
    description: "PPE received and PPE issued records, files, and period dashboards",
    icon: "hard-hat",
    href: getPersonalProtectiveEquipmentHref,
  },
]

export default function SafetyHealthView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Safety & Health
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Safety and health tools for this project — site staff attendance and personal protective
          equipment tracking.
        </p>
      </header>

      <div className="app-choice-grid">
        {SAFETY_HEALTH_OPTIONS.map((item) => (
          <ChoiceCard
            key={item.key}
            href={item.href(projectId)}
            icon={item.icon}
            title={item.label}
            description={item.description}
            iconClassName="app-icon-tile--blue"
          />
        ))}
      </div>
    </div>
  )
}
