import { roundMaterialAmount, roundMaterialUnitPrice } from "@/lib/plantCostCalculations"

const FILLER_WORDS = new Set(["a", "an", "and", "the", "of", "for", "to", "on", "in", "at", "with"])

const UNIT_WORDS = new Set([
  "no",
  "nos",
  "nr",
  "each",
  "bag",
  "bags",
  "roll",
  "rolls",
  "m",
  "m2",
  "m3",
  "mm",
  "kg",
  "ton",
  "tonne",
  "tonnes",
  "l",
  "lt",
  "litre",
  "litres",
  "liter",
  "liters",
])

function stemWord(word) {
  let stem = word
  if (stem.length > 3 && stem.endsWith("s") && !/(ss|us|is)$/.test(stem)) {
    stem = stem.slice(0, -1)
  }
  for (const suffix of ["ation", "ing", "ed"]) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= 4) {
      stem = stem.slice(0, -suffix.length)
      if (suffix === "ing" && stem.length >= 4 && stem.at(-1) === stem.at(-2)) {
        stem = stem.slice(0, -1)
      }
      return stem
    }
  }
  return stem
}

function rawTokens(description) {
  return String(description || "")
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stemWord)
}

export function descriptionNumbers(description) {
  return rawTokens(description)
    .filter((token) => /\d/.test(token))
    .sort()
    .join("|")
}

export function descriptionWords(description) {
  return rawTokens(description).filter(
    (token) => !/\d/.test(token) && !FILLER_WORDS.has(token) && !UNIT_WORDS.has(token)
  )
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[right.length]
}

function wordsClose(left, right) {
  if (left === right) return true
  const shorter = Math.min(left.length, right.length)
  if (shorter < 4) return false
  if (left[0] !== right[0]) return false
  const allowed = shorter >= 8 ? 2 : 1
  if (Math.abs(left.length - right.length) > allowed) return false
  return editDistance(left, right) <= allowed
}

function sameWords(leftWords, rightWords) {
  if (leftWords.length === 0 || rightWords.length === 0) return false
  if (leftWords.length !== rightWords.length) return false
  const used = new Set()
  for (const word of leftWords) {
    const match = rightWords.findIndex((other, index) => !used.has(index) && wordsClose(word, other))
    if (match < 0) return false
    used.add(match)
  }
  return true
}

export function descriptionsMatch(left, right) {
  const leftText = String(left || "").trim().toLowerCase()
  const rightText = String(right || "").trim().toLowerCase()
  if (!leftText || !rightText || leftText === "—" || rightText === "—") return leftText === rightText
  if (leftText === rightText) return true
  if (descriptionNumbers(left) !== descriptionNumbers(right)) return false
  return sameWords(descriptionWords(left), descriptionWords(right))
}

function chooseUniversalDescription(labelCounts) {
  let best = ""
  let bestCount = -1
  let bestLength = -1
  for (const [label, count] of labelCounts) {
    const length = String(label || "").trim().length
    if (
      count > bestCount ||
      (count === bestCount && length > bestLength) ||
      (count === bestCount && length === bestLength && String(label).localeCompare(best) < 0)
    ) {
      best = label
      bestCount = count
      bestLength = length
    }
  }
  return best
}

export function groupBySimilarDescription(items, getDescription) {
  const groups = []

  for (const item of items) {
    const description = String(getDescription(item) || "").trim() || "—"
    const words = descriptionWords(description)
    const numbers = descriptionNumbers(description)
    const group = groups.find((candidate) => {
      if (candidate.numbers !== numbers) return false
      if (words.length === 0 || candidate.words.length === 0) {
        return candidate.anchor === description.toLowerCase()
      }
      return sameWords(candidate.words, words)
    })

    if (group) {
      group.labelCounts.set(description, (group.labelCounts.get(description) || 0) + 1)
      group.items.push(item)
      continue
    }

    groups.push({
      words,
      numbers,
      anchor: description.toLowerCase(),
      labelCounts: new Map([[description, 1]]),
      items: [item],
    })
  }

  return groups.map((group) => ({
    description: chooseUniversalDescription(group.labelCounts),
    items: group.items,
  }))
}

function firstUnit(items) {
  for (const item of items) {
    const unit = String(item?.unit || "").trim()
    if (unit) return unit
  }
  return ""
}

/** One description per similar wording, with quantity and cost added together. */
export function mergeSimilarQuantityLines(lines) {
  return groupBySimilarDescription(lines, (line) => line.description)
    .map((group, index) => {
      let quantity = 0
      let totalCost = 0
      for (const line of group.items) {
        quantity = roundMaterialAmount(quantity + (Number(line.quantity) || 0)) ?? quantity
        totalCost = roundMaterialUnitPrice(totalCost + (Number(line.totalCost) || 0)) ?? totalCost
      }
      return {
        id: `similar-${index}`,
        description: group.description,
        unit: firstUnit(group.items),
        quantity,
        totalCost,
      }
    })
    .sort((left, right) => left.description.localeCompare(right.description))
}

/**
 * Received rows stay on the table. Requested quantities for the same material,
 * including a different spelling, are subtracted to give material left.
 */
export function mergeSimilarReceivedLines(receivedLines, acquiredLines) {
  const tagged = [
    ...(receivedLines || []).map((line) => ({ ...line, side: "received" })),
    ...(acquiredLines || []).map((line) => ({ ...line, side: "acquired" })),
  ]
  return groupBySimilarDescription(tagged, (line) => line.description)
    .filter((group) => group.items.some((item) => item.side === "received"))
    .map((group, index) => {
      let quantity = 0
      let totalCost = 0
      let acquiredQty = 0
      for (const item of group.items) {
        if (item.side === "received") {
          quantity = roundMaterialAmount(quantity + (Number(item.quantity) || 0)) ?? quantity
          totalCost = roundMaterialUnitPrice(totalCost + (Number(item.totalCost) || 0)) ?? totalCost
        } else {
          acquiredQty = roundMaterialAmount(acquiredQty + (Number(item.quantity) || 0)) ?? acquiredQty
        }
      }
      return {
        id: `gr-similar-${index}`,
        description: group.description,
        unit: firstUnit(group.items.filter((item) => item.side === "received")),
        quantity,
        totalCost,
        currentGoodsBalance: roundMaterialAmount(acquiredQty - quantity) ?? 0,
      }
    })
    .sort((left, right) => left.description.localeCompare(right.description))
}

export function mergeSimilarSiteRows(rows) {
  return groupBySimilarDescription(rows, (row) => row.description)
    .map((group, index) => {
      let goodsOnSite = 0
      let goodsUsed = 0
      const locations = []
      for (const row of group.items) {
        goodsOnSite = roundMaterialAmount(goodsOnSite + (Number(row.goodsOnSite) || 0)) ?? goodsOnSite
        goodsUsed = roundMaterialAmount(goodsUsed + (Number(row.goodsUsed) || 0)) ?? goodsUsed
        for (const place of String(row.location || "").split(",")) {
          const location = place.trim()
          if (location && !locations.includes(location)) locations.push(location)
        }
      }
      return {
        key: `similar-site-${index}`,
        description: group.description,
        unit: firstUnit(group.items),
        goodsOnSite,
        goodsUsed,
        location: locations.join(", "),
        goodsLeft: roundMaterialAmount(goodsOnSite - goodsUsed) ?? 0,
      }
    })
    .filter((row) => row.goodsOnSite !== 0 || row.goodsUsed !== 0 || row.goodsLeft !== 0)
    .sort((left, right) => left.description.localeCompare(right.description))
}
