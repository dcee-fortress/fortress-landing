"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import {
  getEquipmentInUseHref,
  getPlantOperatorsHref,
} from "@/lib/projectRoutes"

const PLANT_ON_SITE_OPTIONS = [
  {
    key: "plant-operators",
    label: "Register for Plant Operators",
    description: "Register operators, assign plant, and manage operator records on site",
    icon: "users",
    href: getPlantOperatorsHref,
  },
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
          Manage plant operators and equipment in use — register attendance and record operating
          hours that cumulate from project start.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANT_ON_SITE_OPTIONS.map((item) => (
          <Link
            key={item.key}
            href={item.href(projectId)}
            className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 transition group-hover:bg-orange-100">
              <Icon name={item.icon} size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-zinc-900">{item.label}</h2>
              <p className="text-sm leading-relaxed text-zinc-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
