"use client"

import { formatOperatingHours } from "@/lib/plantHoursData"

export default function PlantHoursTotalCard({ title, totalHours, description }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">
        {formatOperatingHours(totalHours)}
        <span className="ml-2 text-base font-semibold text-zinc-600">hours</span>
      </p>
      {description ? <p className="mt-2 text-sm text-orange-950/80">{description}</p> : null}
    </div>
  )
}
