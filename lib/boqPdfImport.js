import {
  assembleNumberedBoqItems,
  isBoqItemNumberToken,
  matchBoqItemNumberAtStart,
} from "@/lib/boqNumberedRows"

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
  "km",
  "ha",
  "l",
  "lt",
  "litre",
  "liter",
  "litres",
  "mm",
  "cm",
  "set",
  "wk",
  "week",
  "weeks",
  "month",
  "months",
  "ps",
  "prov",
  "bag",
  "bags",
  "load",
  "loads",
  "trip",
  "trips",
  "pair",
])

function parseRateToken(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function stripNumberText(value) {
  return String(value ?? "")
    .trim()
    .replace(/^(?:R|ZAR|USD|US\$|\$)\s*/i, "")
    .replace(/\s+/g, "")
}

function isNumberToken(value) {
  const text = stripNumberText(value)
  return /^\d[\d,]*(\.\d+)?$/.test(text)
}

function joinUnitTokens(tokens) {
  const joined = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (/^m$/i.test(token) && next && /^(2|3|²|³)$/.test(next)) {
      joined.push(next === "²" ? "m2" : next === "³" ? "m3" : `m${next}`)
      index += 1
      continue
    }
    joined.push(token)
  }
  return joined
}

function joinThousandsTokens(tokens) {
  const joined = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (/^\d{1,3}$/.test(token) && next && /^\d{3}(?:\.\d+)?$/.test(stripNumberText(next))) {
      joined.push(`${token}${stripNumberText(next)}`)
      index += 1
      continue
    }
    joined.push(token)
  }
  return joined
}

function isUnitToken(value) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/\s+/g, "")
  if (UNIT_TOKENS.has(cleaned)) return true
  return /^m[23²³](?:\/?km)?$/.test(cleaned)
}

function cleanUnit(value) {
  const compact = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
  if (/^m(?:2|²)$/i.test(compact)) return "m2"
  if (/^m(?:3|³)$/i.test(compact)) return "m3"
  if (/^m(?:3|³)\/?km$/i.test(compact)) return "m3.km"
  return String(value ?? "").trim()
}

function positionedLines(items) {
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

  // Tight Y banding so separate BOQ rows (1.2 vs 1.3) are not glued into one line.
  const lines = []
  for (const item of positioned) {
    const line = lines.find((entry) => Math.abs(entry.y - item.y) < 1.6)
    if (line) {
      line.items.push(item)
      line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length
    } else {
      lines.push({ y: item.y, items: [item] })
    }
  }

  lines.sort((a, b) => b.y - a.y)

  return lines.map((line) => ({
    y: line.y,
    cells: splitLineCells(line.items),
  }))
}

function splitLineCells(items) {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const cells = []
  let text = ""
  let startX = null
  let endX = null

  const push = () => {
    if (!text.trim() || startX == null || endX == null) return
    cells.push({ text: text.trim(), x: startX, width: Math.max(endX - startX, 4) })
  }

  for (const item of sorted) {
    const gap = endX == null ? 0 : item.x - endX
    if (endX != null && gap > 6) {
      push()
      text = item.text
      startX = item.x
    } else {
      if (!text) startX = item.x
      if (text && !text.endsWith(" ") && !item.text.startsWith(" ")) text += " "
      text += item.text
    }
    endX = Math.max(endX ?? 0, item.x + item.width)
  }

  push()
  return cells
}

export function textItemsToRows(items) {
  return positionedLines(items)
    .map((line) => line.cells.map((cell) => cell.text))
    .filter((cells) => cells.some((cell) => String(cell).trim()))
}

function headerScore(line) {
  const text = line.cells.map((cell) => cell.text).join(" ").toLowerCase()
  let score = 0
  if (/description|activity/.test(text)) score += 3
  if (/\bqty\b|quantity|measured/.test(text)) score += 2
  if (/\brate\b/.test(text)) score += 2
  if (/\bunit\b|\buom\b/.test(text)) score += 1
  if (/\d{2,}/.test(text)) score -= 3
  return score
}

function headerColumns(cells) {
  const sorted = [...cells].sort((a, b) => a.x - b.x)
  const columns = []
  for (const cell of sorted) {
    const last = columns[columns.length - 1]
    if (last && cell.x - (last.x + last.width) < 8) {
      last.text = `${last.text} ${cell.text}`.replace(/\s+/g, " ").trim()
      last.width = cell.x + cell.width - last.x
      continue
    }
    columns.push({ text: cell.text, x: cell.x, width: cell.width })
  }
  return columns
}

function ensureDescriptionColumn(columns) {
  if (!columns.length) return columns
  const hasDescription = columns.some((column) =>
    /description|activity|particular|work|item/i.test(column.text)
  )
  if (hasDescription) return columns
  return [{ text: "Description", x: columns[0].x - 1000, width: 10 }, ...columns]
}

function columnIndexFor(cell, columns) {
  if (!columns.length) return 0
  const numeric = isNumberToken(cell.text) || /^[\d,.\s]+$/.test(String(cell.text).trim())
  const probe = numeric ? cell.x + cell.width / 2 : cell.x + 1
  if (probe < columns[0].x - 1) return 0
  for (let column = 0; column < columns.length; column += 1) {
    const start = columns[column].x - 1
    const end = columns[column + 1]?.x ?? Infinity
    if (probe >= start && probe < end) return column
  }
  return columns.length - 1
}

function alignLine(cells, columns) {
  const buckets = columns.map(() => [])
  for (const cell of cells) {
    buckets[columnIndexFor(cell, columns)].push(cell.text)
  }
  return buckets.map((parts) => parts.join(" ").replace(/\s+/g, " ").trim())
}

function matrixFromPages(pages) {
  const matrix = []
  let columns = null

  for (const pageItems of pages ?? []) {
    const lines = positionedLines(pageItems)
    let bestIndex = -1
    let bestScore = 0
    lines.forEach((line, index) => {
      const score = headerScore(line)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    let headerIndexes = new Set()
    if (bestIndex >= 0 && bestScore >= 4) {
      const group = [lines[bestIndex]]
      headerIndexes.add(bestIndex)
      for (const neighbor of [bestIndex - 1, bestIndex + 1]) {
        const line = lines[neighbor]
        if (!line || headerScore(line) < 2 || Math.abs(line.y - lines[bestIndex].y) > 16) continue
        group.push(line)
        headerIndexes.add(neighbor)
      }
      columns = ensureDescriptionColumn(headerColumns(group.flatMap((line) => line.cells)))
      if (matrix.length === 0) matrix.push(columns.map((column) => column.text))
    }

    if (!columns) {
      matrix.push(...lines.map((line) => line.cells.map((cell) => cell.text)))
      continue
    }

    for (let index = 0; index < lines.length; index += 1) {
      if (headerIndexes.has(index)) continue
      const line = lines[index]
      if (headerScore(line) >= 4) continue
      // Keep every line on the page — titles above the header and every BOQ row.
      const aligned = alignLine(line.cells, columns)
      if (aligned.some((cell) => cell)) matrix.push(aligned)
    }
  }

  return matrix
}

function readRatesAfterQuantity(numbers) {
  let billRate = null
  let allowableRate = null
  if (numbers.length >= 2) {
    billRate = parseRateToken(numbers[0])
    allowableRate = parseRateToken(numbers[1])
  } else if (numbers.length === 1) {
    billRate = parseRateToken(numbers[0])
  }
  return { billRate, allowableRate }
}

function parseLooseBoqLine(cells) {
  let tokens = joinThousandsTokens(
    joinUnitTokens(cells.flatMap((cell) => String(cell ?? "").trim().split(/\s+/)).filter(Boolean))
  )
  if (tokens.length === 0) return null

  const heading = tokens.join(" ").toLowerCase()
  if (
    /\brate\b/.test(heading) &&
    /\b(qty|quantity|description|activity|amount|unit)\b/.test(heading) &&
    !/\d/.test(heading)
  ) {
    return null
  }

  if (tokens.length === 1) {
    return { itemNo: "", unit: "", quantity: null, allowableRate: null, billRate: null, rate: null, itemName: tokens[0] }
  }

  let itemNo = ""
  if (isBoqItemNumberToken(tokens[0])) {
    itemNo = tokens[0]
    tokens = tokens.slice(1)
  } else {
    const numbered = matchBoqItemNumberAtStart(tokens.join(" "))
    if (numbered?.itemNo) {
      itemNo = numbered.itemNo
      const rest = numbered.rest
      tokens = rest ? rest.split(/\s+/).filter(Boolean) : []
    }
  }

  const unitIndex = (() => {
    let chosen = -1
    for (let index = 0; index < tokens.length; index += 1) {
      if (!isUnitToken(tokens[index])) continue
      if (tokens.slice(index + 1).some((token) => isNumberToken(token))) chosen = index
    }
    return chosen >= 0 ? chosen : tokens.findIndex((token) => isUnitToken(token))
  })()
  let quantity = null
  let allowableRate = null
  let billRate = null
  let unit = ""
  let nameTokens = []

  if (unitIndex >= 0) {
    unit = cleanUnit(tokens[unitIndex])
    const before = tokens.slice(0, unitIndex)
    const numbersAfter = tokens.slice(unitIndex + 1).filter((token) => isNumberToken(token))
    const tokenBefore = before[before.length - 1]
    if (tokenBefore && isNumberToken(tokenBefore)) {
      quantity = parseRateToken(tokenBefore)
      before.pop()
      const rates = readRatesAfterQuantity(numbersAfter)
      billRate = rates.billRate
      allowableRate = rates.allowableRate
    } else if (numbersAfter.length >= 2) {
      quantity = parseRateToken(numbersAfter[0])
      billRate = parseRateToken(numbersAfter[1])
      if (numbersAfter.length >= 4) allowableRate = parseRateToken(numbersAfter[2])
    } else if (numbersAfter.length === 1) {
      quantity = parseRateToken(numbersAfter[0])
    }
    nameTokens = before
  } else {
    const numbers = []
    let index = tokens.length - 1
    while (index >= 0 && isNumberToken(tokens[index])) {
      numbers.unshift(tokens[index])
      index -= 1
    }
    nameTokens = tokens.slice(0, index + 1)
    if (numbers.length >= 4) {
      quantity = parseRateToken(numbers[0])
      allowableRate = parseRateToken(numbers[1])
      billRate = parseRateToken(numbers[2])
    } else if (numbers.length >= 2) {
      quantity = parseRateToken(numbers[0])
      billRate = parseRateToken(numbers[1])
    } else if (numbers.length === 1) {
      quantity = parseRateToken(numbers[0])
    }
  }

  if (billRate != null && billRate >= 1990 && billRate <= 2099 && Number.isInteger(billRate)) {
    billRate = null
  }
  if (allowableRate != null && allowableRate >= 1990 && allowableRate <= 2099 && Number.isInteger(allowableRate)) {
    allowableRate = null
  }

  const itemName = nameTokens.join(" ").replace(/\s+/g, " ").trim()
  const rate = billRate ?? allowableRate
  const fallbackName = cells
    .map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim()
  const resolvedName = itemName || fallbackName
  if (!resolvedName) return null
  if (rate != null && rate < 0) return null

  return {
    itemNo,
    unit,
    quantity,
    allowableRate,
    billRate,
    rate,
    itemName: resolvedName,
  }
}

function parseLooseBoqMatrix(matrix) {
  // Numbering drives rows: 1.0, 1.1, … each keep their full description until the next number.
  return assembleNumberedBoqItems(matrix, parseLooseBoqLine)
}

export function itemsFromPdfMatrix(matrix, parseBoqRows) {
  // Prefer numbering-based assembly so each BOQ item no. is its own full-description row.
  const loose = parseLooseBoqMatrix(matrix)
  if (loose.length > 0) return loose
  return typeof parseBoqRows === "function" ? parseBoqRows(matrix) : []
}

export async function parseBoqPdfFile(file) {
  const { extractTextItems } = await import("unpdf")
  const { parseBoqRows } = await import("@/lib/boqData")
  const data = new Uint8Array(await file.arrayBuffer())
  const extracted = await extractTextItems(data)
  return itemsFromPdfMatrix(matrixFromPages(extracted.items ?? []), parseBoqRows)
}
