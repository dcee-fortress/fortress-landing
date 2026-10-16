"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import { getEquipmentInUseHref } from "@/lib/projectRoutes"

const PLANT_ON_SITE_OPTIONS = [
  {
    key: "equipment-in-use",
    label: "Equipment in Use on Site",
    description: "Daily equipment lists and cumulative hours from register ticks and hour entries",
    icon: "hard-hat",
    href: getEquipmentInUseHref,
  },
]

export default function PlantOnSiteView({ projectId, projectName }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Plant on Site
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Record operating hours for equipment in use. Hours cumulate from project start. The plant
          register is under Safety and Health → Registers.
        </p>
      </header>

      <div className="app-choice-grid">
        {PLANT_ON_SITE_OPTIONS.map((item) => (
          <ChoiceCard
            key={item.key}
            href={item.href(projectId)}
            icon={item.icon}
            title={item.label}
            description={item.description}
            iconClassName="app-icon-tile--orange"
          />
        ))}
      </div>
    </div>
  )
}
