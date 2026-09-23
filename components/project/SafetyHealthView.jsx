"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import {
  getPersonalProtectiveEquipmentHref,
  getPpeRegistersHref,
  getSafetyReportsHref,
} from "@/lib/projectRoutes"

const SAFETY_HEALTH_OPTIONS = [
  {
    key: "ppe-registers",
    label: "PPE registers",
    description: "Site staff attendance and induction register files",
    icon: "list",
    href: getPpeRegistersHref,
  },
  {
    key: "ppe",
    label: "Personal protective equipment",
    description: "PPE received and PPE issued daily files and project-to-date costs",
    icon: "hard-hat",
    href: getPersonalProtectiveEquipmentHref,
  },
  {
    key: "safety-reports",
    label: "Safety reports",
    description: "SHEQ site inspection and incident reports",
    icon: "shield",
    href: getSafetyReportsHref,
  },
]

export default function SafetyHealthView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Safety and Health
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight text-zinc-900"
          suppressHydrationWarning
        >
          {projectName}
        </h1>
        <p className="max-w-2xl text-zinc-500">
          Safety and health tools for this project — PPE registers, personal protective equipment,
          and safety reports.
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
