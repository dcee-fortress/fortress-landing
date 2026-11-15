const UNIT_TOKENS = new Set([
  "m",
  "m2",
  "m3",
  "m²",
  "m³",
  "sqm",
  "cum",
  "lm",
  "nr",
  "no",
  "nos",
  "kg",
  "t",
  "ton",
  "tonne",
  "ls",
  "sum",
  "item",
  "ea",
  "each",
  "hr",
  "hrs",
  "hour",
  "hours",
  "day",
  "days",
])

function parseRateToken(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function isNumberToken(value) {
  return /^\$?\d[\d,]*(\.\d+)?$/.test(String(value ?? "").trim())
}

function isUnitToken(value) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
  return UNIT_TOKENS.has(cleaned)
}

function isItemCode(value) {
  return /^[\d.]+$/.test(String(value ?? "").trim())
}

export function textItemsToRows(items) {
  const positioned = []

  for (const item of items ?? []) {
    const text = String(item?.str ?? "")
    if (!text.trim()) continue
    const x = item.x ?? item.transform?.[4] ?? 0
    const y = item.y ?? item.transform?.[5] ?? 0
    positioned.push({
      text,
      x,
      y,
      width: Number(item.width) || Math.max(text.length * 3.5, 4),
    })
  }

  positioned.sort((a, b) => b.y - a.y || a.x - b.x)

  const lines = []
  for (const item of positioned) {
    const line = lines.find((entry) => Math.abs(entry.y - item.y) < 2.8)
    if (line) {
      line.items.push(item)
    } else {
      lines.push({ y: item.y, items: [item] })
    }
  }

  return lines
    .map((line) => {
      const sorted = [...line.items].sort((a, b) => a.x - b.x)
      const cells = []
      let current = ""
      let endX = null

      for (const item of sorted) {
        const gap = endX == null ? 0 : item.x - endX
        if (endX != null && gap > 6) {
          if (current.trim()) cells.push(current.trim())
          current = item.text
        } else {
          if (current && !current.endsWith(" ") && !item.text.startsWith(" ")) {
            current += " "
          }
          current += item.text
        }
        endX = Math.max(endX ?? 0, item.x + item.width)
      }

      if (current.trim()) cells.push(current.trim())
      return cells
    })
    .filter((cells) => cells.some((cell) => String(cell).trim()))
}

function namedItemCount(items) {
  return items.filter((item) => String(item.itemName ?? "").replace(/[^a-z]/gi, "").length >= 3).length
}

function looksLikeUsefulBoq(items) {
  if (!items.length) return false
  const named = namedItemCount(items)
  return named >= Math.min(2, items.length) && named / items.length >= 0.5
}

function parseLooseBoqMatrix(matrix) {
  const items = []
  const seen = new Set()

  for (const cells of matrix ?? []) {
    const tokens = cells.flatMap((cell) => String(cell ?? "").trim().split(/\s+/)).filter(Boolean)
    if (tokens.length < 2) continue

    const heading = tokens.join(" ").toLowerCase()
    if (
      (heading.includes("description") || heading.includes("activity")) &&
      heading.includes("rate")
    ) {
      continue
    }

    let itemNo = ""
    if (tokens.length && isItemCode(tokens[0])) {
      itemNo = tokens[0]
      tokens.shift()
    }

    const numbers = []
    let index = tokens.length - 1
    while (index >= 0 && isNumberToken(tokens[index])) {
      numbers.unshift({ index, raw: tokens[index] })
      index -= 1
    }
    if (!numbers.length) continue

    let unit = ""
    if (index >= 0 && isUnitToken(tokens[index])) {
      unit = tokens[index]
      index -= 1
    }

    let allowableRate = null
    let billRate = null
    if (numbers.length >= 4) {
      allowableRate = parseRateToken(numbers[1].raw)
      billRate = parseRateToken(numbers[2].raw)
    } else if (unit && numbers.length >= 2) {
      billRate = parseRateToken(numbers[1].raw)
    } else if (numbers.length >= 3) {
      billRate = parseRateToken(numbers[1].raw)
    } else if (numbers.length === 2) {
      billRate = parseRateToken(numbers[0].raw)
    } else {
      billRate = parseRateToken(numbers[0].raw)
    }

    const rate = billRate ?? allowableRate
    if (rate === null || rate <= 0) continue

    const nameTokens = tokens.slice(0, index + 1)
    const itemName = nameTokens.join(" ").replace(/\s+/g, " ").trim()
    if (itemName.replace(/[^a-z]/gi, "").length < 3) continue
    if (/^(total|sub total|subtotal|grand total|carried forward|brought forward)$/i.test(itemName)) {
      continue
    }

    const key = itemName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    items.push({
      id: `boq-${items.length}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
      itemName,
      rate,
      ...(billRate !== null ? { billRate } : {}),
      ...(allowableRate !== null ? { allowableRate } : {}),
      ...(itemNo ? { itemNo } : {}),
      ...(unit ? { unit } : {}),
    })
  }

  return items
}

export function itemsFromPdfMatrix(matrix, parseBoqRows) {
  const parsed = typeof parseBoqRows === "function" ? parseBoqRows(matrix) : []
  if (looksLikeUsefulBoq(parsed)) return parsed

  const loose = parseLooseBoqMatrix(matrix)
  if (loose.length > parsed.length) return loose
  return parsed.length ? parsed : loose
}

export async function parseBoqPdfFile(file) {
  const { extractTextItems } = await import("unpdf")
  const { parseBoqRows } = await import("@/lib/boqData")
  const data = new Uint8Array(await file.arrayBuffer())
  const extracted = await extractTextItems(data)
  const matrix = []

  for (const pageItems of extracted.items ?? []) {
    matrix.push(...textItemsToRows(pageItems))
  }

  return itemsFromPdfMatrix(matrix, parseBoqRows)
}
