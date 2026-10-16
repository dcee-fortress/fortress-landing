"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getGoodsReceivedDashboardLinesForDay } from "@/lib/goodsReceived"
import {
  getMaterialOnSiteDayDraft,
  saveMaterialOnSiteDay,
} from "@/lib/materialOnSite"
import { formatMaterialAmount, parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { getDailyFile } from "@/lib/projectFiles"
import { getMaterialOnSiteDailyFileHref } from "@/lib/projectRoutes"

function quantityText(amount, unit) {
  const formatted = formatMaterialAmount(amount)
  return unit ? `${formatted} ${unit}` : formatted
}

function descriptionKey(description) {
  return String(description || "").trim().toLowerCase()
}

export default function MaterialOnSiteEntryView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const [drafts, setDrafts] = useState({})
  const draftsRef = useRef(drafts)
  const saveTimer = useRef(0)
  const pendingSave = useRef(null)
  draftsRef.current = drafts

  const lines = useMemo(() => {
    void version
    return getGoodsReceivedDashboardLinesForDay(projectId, dayId).filter(
      (line) => descriptionKey(line.description) && line.description !== "—"
    )
  }, [dayId, projectId, version])

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      let changed = false
      for (const line of lines) {
        const key = descriptionKey(line.description)
        if (!next[key]) {
          next[key] = getMaterialOnSiteDayDraft(projectId, dayId, line.description)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [dayId, lines, projectId])

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimer.current)
      const pending = pendingSave.current
      if (pending) saveMaterialOnSiteDay(pending.projectId, pending.dayId, pending.drafts)
    }
  }, [])

  function updateDraft(line, patch) {
    const key = descriptionKey(line.description)
    const previous = draftsRef.current[key] || { goodsUsed: "", location: "" }
    const next = {
      ...draftsRef.current,
      [key]: {
        ...previous,
        ...patch,
        description: line.description,
      },
    }
    draftsRef.current = next
    setDrafts(next)
    pendingSave.current = { projectId, dayId, drafts: next }
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      const pending = pendingSave.current
      pendingSave.current = null
      if (pending) saveMaterialOnSiteDay(pending.projectId, pending.dayId, pending.drafts)
    }, 350)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialOnSiteDailyFileHref(projectId, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily report
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Material schedule entry
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Descriptions and goods on site are copied from goods
          received. Goods left on site is goods on site minus goods used on site.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Description of good</th>
                <th className="px-4 py-3 text-right">Goods on site</th>
                <th className="px-4 py-3">Goods used on site</th>
                <th className="px-4 py-3">Location used</th>
                <th className="px-4 py-3 text-right">Goods left on site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                    No goods were received on this day, so there is nothing to enter.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const key = descriptionKey(line.description)
                  const draft = drafts[key] || { goodsUsed: "", location: "" }
                  const goodsOnSite = roundMaterialAmount(line.quantity) ?? 0
                  const goodsUsed = parsePlantCostAmount(draft.goodsUsed) ?? 0
                  const goodsLeft = roundMaterialAmount(goodsOnSite - goodsUsed) ?? 0
                  return (
                    <tr key={key}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{line.description}</td>
                      <td className="px-4 py-3 text-right text-zinc-800">
                        {quantityText(goodsOnSite, line.unit)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.goodsUsed}
                          onChange={(event) => updateDraft(line, { goodsUsed: event.target.value })}
                          className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-right text-zinc-900"
                          aria-label={`Goods used on site for ${line.description}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={draft.location}
                          onChange={(event) => updateDraft(line, { location: event.target.value })}
                          className="w-full min-w-40 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                          aria-label={`Location used for ${line.description}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-800">
                        {quantityText(goodsLeft, line.unit)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
