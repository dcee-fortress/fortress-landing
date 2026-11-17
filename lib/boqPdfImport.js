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
  return UNIT_TOKENS.has(cleaned)
}

function isItemCode(value) {
  return /^[\d.]+$/.test(String(value ?? "").trim())
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

  const lines = []
  for (const item of positioned) {
    const line = lines.find((entry) => Math.abs(entry.y - item.y) < 2.8)
    if (line) {
      line.items.push(item)
    } else {
      lines.push({ y: item.y, items: [item] })
    }
  }

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

function columnIndexFor(cell, columns) {
  const probe = cell.x + Math.min(cell.width * 0.2, 6)
  let index = 0
  for (let column = 0; column < columns.length; column += 1) {
    if (columns[column].x <= probe + 2) index = column
  }
  return index
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
      columns = headerColumns(group.flatMap((line) => line.cells))
      if (matrix.length === 0) matrix.push(columns.map((column) => column.text))
    }

    if (!columns) {
      matrix.push(...lines.map((line) => line.cells.map((cell) => cell.text)))
      continue
    }

    const headerYs = [...headerIndexes].map((index) => lines[index]?.y).filter((y) => y != null)
    const headerBottom = headerYs.length ? Math.min(...headerYs) : null
    for (let index = 0; index < lines.length; index += 1) {
      if (headerIndexes.has(index)) continue
      const line = lines[index]
      if (headerBottom != null && line.y > headerBottom + 1) continue
      if (headerScore(line) >= 4) continue
      const aligned = alignLine(line.cells, columns)
      if (aligned.some((cell) => cell)) matrix.push(aligned)
    }
  }

  return matrix
}

function namedItemCount(items) {
  return items.filter((item) => String(item.itemName ?? "").replace(/[^a-z]/gi, "").length >= 3).length
}

function looksLikeUsefulBoq(items) {
  if (!items.length) return false
  const named = namedItemCount(items)
  return named >= Math.min(2, items.length) && named / items.length >= 0.5
}

function parseLooseBoqLine(cells) {
  let tokens = joinThousandsTokens(
    joinUnitTokens(cells.flatMap((cell) => String(cell ?? "").trim().split(/\s+/)).filter(Boolean))
  )
  if (tokens.length < 2) return null

  const heading = tokens.join(" ").toLowerCase()
  if ((heading.includes("description") || heading.includes("activity")) && heading.includes("rate")) {
    return null
  }

  let itemNo = ""
  if (isItemCode(tokens[0])) {
    itemNo = tokens[0]
    tokens = tokens.slice(1)
  }

  const numbers = []
  let index = tokens.length - 1
  while (index >= 0 && isNumberToken(tokens[index])) {
    numbers.unshift(tokens[index])
    index -= 1
  }

  const nameTokens = tokens.slice(0, index + 1)
  const itemName = nameTokens.join(" ").replace(/\s+/g, " ").trim()
  if (!numbers.length) {
    if (itemName.replace(/[^a-z]/gi, "").length < 3) return null
    return { continuation: itemName }
  }

  let unit = ""
  if (index >= 0 && isUnitToken(tokens[index])) {
    unit = tokens[index]
    nameTokens.pop()
  }

  let quantity = null
  let allowableRate = null
  let billRate = null
  if (numbers.length >= 4) {
    quantity = parseRateToken(numbers[0])
    allowableRate = parseRateToken(numbers[1])
    billRate = parseRateToken(numbers[2])
  } else if (numbers.length === 3) {
    quantity = parseRateToken(numbers[0])
    billRate = parseRateToken(numbers[1])
  } else if (numbers.length === 2) {
    quantity = parseRateToken(numbers[0])
    billRate = parseRateToken(numbers[1])
  } else {
    billRate = parseRateToken(numbers[0])
  }

  const rate = billRate ?? allowableRate
  if (rate === null || rate < 0) return null

  return {
    itemNo,
    unit,
    quantity,
    allowableRate,
    billRate,
    rate,
    itemName: nameTokens.join(" ").replace(/\s+/g, " ").trim(),
  }
}

function parseLooseBoqMatrix(matrix) {
  const items = []
  const seen = new Set()
  let pendingName = ""

  for (const cells of matrix ?? []) {
    const parsed = parseLooseBoqLine(cells)
    if (!parsed) continue
    if (parsed.continuation) {
      pendingName = pendingName ? `${pendingName} ${parsed.continuation}` : parsed.continuation
      continue
    }

    const itemName = [pendingName, parsed.itemName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
    pendingName = ""
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
      rate: parsed.rate,
      ...(parsed.billRate !== null ? { billRate: parsed.billRate } : {}),
      ...(parsed.allowableRate !== null ? { allowableRate: parsed.allowableRate } : {}),
      ...(parsed.itemNo ? { itemNo: parsed.itemNo } : {}),
      ...(parsed.unit ? { unit: parsed.unit } : {}),
      ...(parsed.quantity !== null ? { quantity: parsed.quantity } : {}),
    })
  }

  return items
}

function assignmentScore(items) {
  return items.reduce((score, item) => {
    const rate = item.billRate ?? item.rate
    if (rate == null) return score
    let next = score + 1
    if (item.quantity != null) next += 3
    if (item.quantity != null && item.quantity !== rate) next += 2
    return next
  }, 0)
}

export function itemsFromPdfMatrix(matrix, parseBoqRows) {
  const parsed = typeof parseBoqRows === "function" ? parseBoqRows(matrix) : []
  const loose = parseLooseBoqMatrix(matrix)
  if (!looksLikeUsefulBoq(parsed)) return loose
  if (!looksLikeUsefulBoq(loose)) return parsed
  return assignmentScore(loose) > assignmentScore(parsed) ? loose : parsed
}

export async function parseBoqPdfFile(file) {
  const { extractTextItems } = await import("unpdf")
  const { parseBoqRows } = await import("@/lib/boqData")
  const data = new Uint8Array(await file.arrayBuffer())
  const extracted = await extractTextItems(data)
  return itemsFromPdfMatrix(matrixFromPages(extracted.items ?? []), parseBoqRows)
}
