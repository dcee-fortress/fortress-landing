import { normalizeBoqDescription } from "@/lib/boqData"
import { keywordScore } from "@/lib/textMatch"

/**
 * ZimBuild QS — Zimbabwe market guidance for Daily Cost and Daily Production.
 * Matched by activity description keywords. Used as a suggestion only; never
 * auto-fills over Vector Memory or user-entered Build-up values.
 */
const ZIMBUILD_MARKET = [
  {
    id: "excavate-soft",
    labels: ["excavate", "excavation", "bulk dig", "soft excavation"],
    unit: "m3",
    dailyProduction: 80,
    dailyCost: 420,
    note: "Soft excavation with excavator + tipper day rate",
  },
  {
    id: "excavate-hard",
    labels: ["hard rock", "rock excavation", "blast"],
    unit: "m3",
    dailyProduction: 25,
    dailyCost: 980,
    note: "Hard rock excavation day rate",
  },
  {
    id: "fill-compact",
    labels: ["fill", "backfill", "compaction", "compact"],
    unit: "m3",
    dailyProduction: 60,
    dailyCost: 360,
    note: "Fill and compact with roller",
  },
  {
    id: "concrete-foundations",
    labels: ["concrete", "foundations", "footing", "blinding"],
    unit: "m3",
    dailyProduction: 18,
    dailyCost: 1450,
    note: "Ready-mix concrete pour day (labour + plant)",
  },
  {
    id: "formwork",
    labels: ["formwork", "shutter", "shuttering"],
    unit: "m2",
    dailyProduction: 45,
    dailyCost: 520,
    note: "Formwork erect / strike crew day",
  },
  {
    id: "reinforcement",
    labels: ["reinforcement", "rebar", "steel fixing", "high tensile"],
    unit: "kg",
    dailyProduction: 1200,
    dailyCost: 680,
    note: "Steel fixing crew day",
  },
  {
    id: "brickwork",
    labels: ["brick", "brickwork", "blockwork", "masonry"],
    unit: "m2",
    dailyProduction: 35,
    dailyCost: 410,
    note: "Brick / block laying gang day",
  },
  {
    id: "plaster",
    labels: ["plaster", "render", "skimming"],
    unit: "m2",
    dailyProduction: 55,
    dailyCost: 290,
    note: "Internal plaster gang day",
  },
  {
    id: "tiling",
    labels: ["tile", "tiling", "ceramic"],
    unit: "m2",
    dailyProduction: 28,
    dailyCost: 310,
    note: "Floor / wall tiling gang day",
  },
  {
    id: "painting",
    labels: ["paint", "painting", "emulsion"],
    unit: "m2",
    dailyProduction: 120,
    dailyCost: 240,
    note: "Painting crew day",
  },
  {
    id: "roofing",
    labels: ["roof", "roofing", "ibr", "sheeting"],
    unit: "m2",
    dailyProduction: 40,
    dailyCost: 560,
    note: "Roof sheeting crew day",
  },
  {
    id: "road-base",
    labels: ["road", "base course", "subbase", "gravel"],
    unit: "m3",
    dailyProduction: 70,
    dailyCost: 640,
    note: "Road base layer with grader / roller",
  },
  {
    id: "asphalt",
    labels: ["asphalt", "surfacing", "bitumen"],
    unit: "m2",
    dailyProduction: 900,
    dailyCost: 2100,
    note: "Asphalt surfacing day",
  },
  {
    id: "drainage",
    labels: ["drain", "drainage", "pipe laying", "sewer"],
    unit: "m",
    dailyProduction: 40,
    dailyCost: 480,
    note: "Pipe trench and lay crew day",
  },
]

function scoreMarketEntry(description, entry) {
  const text = String(description ?? "").trim()
  if (!text) return 0
  const normalized = normalizeBoqDescription(text)
  let best = 0
  for (const label of entry.labels) {
    const labelKey = normalizeBoqDescription(label)
    if (!labelKey) continue
    if (normalized === labelKey) return 1
    if (normalized.includes(labelKey)) best = Math.max(best, 0.9)
    best = Math.max(best, keywordScore(text, label))
  }
  return best
}

/** Best ZimBuild QS market suggestion for an activity description, or null. */
export function getZimBuildSuggestion(description) {
  const text = String(description ?? "").trim()
  if (!text) return null

  let best = null
  let bestScore = 0
  for (const entry of ZIMBUILD_MARKET) {
    const score = scoreMarketEntry(text, entry)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  if (!best || bestScore < 0.35) return null

  return {
    id: best.id,
    unit: best.unit,
    dailyProduction: best.dailyProduction,
    dailyCost: best.dailyCost,
    note: best.note,
    score: bestScore,
    source: "zimbuild-qs",
  }
}

/**
 * Apply ZimBuild suggestion onto empty Daily Production / Daily Cost fields.
 * Puts suggested daily cost into labourCost as the starting total day cost.
 */
export function applyZimBuildSuggestionToRow(row, suggestion = getZimBuildSuggestion(row?.activityDescription)) {
  if (!suggestion) return row

  const next = { ...row }
  if (!String(next.production ?? "").trim()) {
    next.production = String(suggestion.dailyProduction)
  }
  if (!String(next.laborCost ?? "").trim()) {
    next.laborCost = String(suggestion.dailyCost)
  }
  if (!String(next.unit ?? "").trim() && suggestion.unit) {
    next.unit = suggestion.unit
  }
  next.zimBuildApplied = true
  return next
}
