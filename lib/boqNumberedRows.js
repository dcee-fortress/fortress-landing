/**
 * BOQ row assembly by item numbering.
 * A new number (1.0, 1.1, 2.3.1, …) starts a new row. Text until the next
 * number stays on that row as one full description — never merge two numbered items.
 */

/** Hierarchical BOQ item no. followed by description text (not a lone quantity/rate). */
const ITEM_NO_WITH_TEXT = /(\d+(?:\.\d+)+)\s+(?=[A-Za-z(])/g
const ITEM_NO_ONLY = /^(\d+(?:\.\d+)+)$/
const ITEM_NO_AT_START = /^(\d+(?:\.\d+)+)\b/
/** Integer item nos only when clearly followed by a description word. */
const INTEGER_ITEM_AT_START = /^(\d{1,3})\s+(?=[A-Za-z(])/

export function isBoqItemNumberToken(value) {
  return ITEM_NO_ONLY.test(String(value ?? "").trim())
}

export function matchBoqItemNumberAtStart(text) {
  const value = String(text ?? "").trim()
  if (!value) return null

  let match = value.match(ITEM_NO_AT_START)
  if (match) {
    return { itemNo: match[1], rest: value.slice(match[0].length).trim() }
  }

  match = value.match(INTEGER_ITEM_AT_START)
  if (match) {
    return { itemNo: match[1], rest: value.slice(match[0].length).trim() }
  }

  return null
}

/**
 * If a visual PDF/Excel line accidentally joined two numbered items, split them.
 * Example: "1.2 Remove trees … 1.3 Remove top soil …" → two cell arrays.
 */
export function splitCellsByItemNumbers(cells) {
  const joined = (cells ?? [])
    .map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim()

  if (!joined) return []

  const starts = []
  ITEM_NO_WITH_TEXT.lastIndex = 0
  let match
  while ((match = ITEM_NO_WITH_TEXT.exec(joined)) !== null) {
    starts.push(match.index)
  }

  if (starts.length <= 1) {
    const first = String(cells?.[0] ?? "").trim()
    if (ITEM_NO_ONLY.test(first)) return [cells]
    return [cells]
  }

  const segments = []
  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index]
    const to = starts[index + 1] ?? joined.length
    const slice = joined.slice(from, to).trim()
    if (slice) segments.push([slice])
  }
  return segments.length > 0 ? segments : [cells]
}

function lineHasHeaderNoise(cells) {
  const text = (cells ?? []).map((cell) => String(cell ?? "")).join(" ").toLowerCase()
  if (!text.trim()) return true
  if (
    /\brate\b/.test(text) &&
    /\b(qty|quantity|description|activity|amount|unit)\b/.test(text) &&
    !/\d+(?:\.\d+)+\s+[A-Za-z]/.test(text)
  ) {
    return true
  }
  return false
}

/**
 * Expand a matrix so each physical source line that contains multiple item
 * numbers becomes multiple lines — one per number.
 */
export function expandMatrixByItemNumbers(matrix) {
  const expanded = []
  for (const row of matrix ?? []) {
    if (lineHasHeaderNoise(row)) {
      expanded.push(row)
      continue
    }
    const parts = splitCellsByItemNumbers(row)
    for (const part of parts) expanded.push(part)
  }
  return expanded
}

function pickDescription(parsed, itemNo) {
  const raw = String(parsed?.itemName ?? "").replace(/\s+/g, " ").trim()
  if (!raw) return itemNo ? String(itemNo) : ""
  if (!itemNo) return raw
  const startsWithNo = matchBoqItemNumberAtStart(raw)
  if (startsWithNo?.itemNo === itemNo) return raw
  if (ITEM_NO_ONLY.test(raw)) return `${itemNo}`.trim()
  return `${itemNo} ${raw}`.replace(/\s+/g, " ").trim()
}

function mergeParsedIntoCurrent(current, parsed) {
  if (!current || !parsed) return current

  const extraName = String(parsed.itemName ?? "").replace(/\s+/g, " ").trim()
  if (extraName) {
    const withoutNo = matchBoqItemNumberAtStart(extraName)
    const piece = withoutNo ? withoutNo.rest : extraName
    if (piece) {
      const existing = current.nameParts.join(" ")
      if (!existing.toLowerCase().includes(piece.toLowerCase())) {
        current.nameParts.push(piece)
      }
    }
  }

  if (!current.unit && parsed.unit) current.unit = parsed.unit
  if (current.quantity == null && parsed.quantity != null) current.quantity = parsed.quantity
  if (current.billRate == null && parsed.billRate != null) current.billRate = parsed.billRate
  if (current.allowableRate == null && parsed.allowableRate != null) {
    current.allowableRate = parsed.allowableRate
  }
  if (current.rate == null && parsed.rate != null) current.rate = parsed.rate
  return current
}

function finalizeCurrent(current, index) {
  if (!current) return null
  const itemNo = String(current.itemNo ?? "").trim()
  const body = current.nameParts.join(" ").replace(/\s+/g, " ").trim()
  const itemName = pickDescription({ itemName: body }, itemNo)
  if (!itemName) return null

  const rate = current.billRate ?? current.allowableRate ?? current.rate ?? null
  return {
    id: `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
    itemName,
    ...(itemNo ? { itemNo } : {}),
    ...(current.unit ? { unit: current.unit } : {}),
    ...(current.quantity != null ? { quantity: current.quantity } : {}),
    ...(current.billRate != null ? { billRate: current.billRate } : {}),
    ...(current.allowableRate != null ? { allowableRate: current.allowableRate } : {}),
    ...(rate != null ? { rate } : {}),
  }
}

/**
 * Walk every line. New item number → new BOQ row. Continuation lines append
 * into the open row's full description until the next number appears.
 *
 * @param {unknown[][]} matrix
 * @param {(cells: unknown[]) => object | null} parseLine
 */
export function assembleNumberedBoqItems(matrix, parseLine) {
  const lines = expandMatrixByItemNumbers(matrix)
  const items = []
  let current = null

  const flush = () => {
    const item = finalizeCurrent(current, items.length)
    if (item) items.push(item)
    current = null
  }

  for (const cells of lines) {
    if (lineHasHeaderNoise(cells)) continue

    const firstCell = String(cells?.[0] ?? "").trim()
    const joined = (cells ?? [])
      .map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .trim()

    const parsed = typeof parseLine === "function" ? parseLine(cells) : null
    const parsedItemNo = String(parsed?.itemNo ?? "").trim()

    const start =
      matchBoqItemNumberAtStart(firstCell) ||
      (ITEM_NO_ONLY.test(firstCell) ? { itemNo: firstCell, rest: "" } : null) ||
      matchBoqItemNumberAtStart(joined) ||
      (isBoqItemNumberToken(parsedItemNo) ? { itemNo: parsedItemNo, rest: "" } : null) ||
      matchBoqItemNumberAtStart(String(parsed?.itemName ?? ""))

    // New number always opens a new row — never fold into the previous description.
    if (start?.itemNo) {
      flush()
      const parsedName = String(parsed?.itemName ?? "").trim()
      const fromParse = matchBoqItemNumberAtStart(parsedName)
      const description =
        start.rest ||
        (fromParse ? fromParse.rest : "") ||
        (parsedName && !ITEM_NO_ONLY.test(parsedName) ? parsedName : "") ||
        ""

      current = {
        itemNo: start.itemNo,
        nameParts: description ? [description] : [],
        unit: parsed?.unit || "",
        quantity: parsed?.quantity ?? null,
        billRate: parsed?.billRate ?? null,
        allowableRate: parsed?.allowableRate ?? null,
        rate: parsed?.rate ?? null,
      }

      if (!description && parsedName && !isBoqItemNumberToken(parsedName)) {
        current.nameParts.push(parsedName)
      }
      continue
    }

    if (current) {
      // Wrapped description / qty line for the open item number only.
      mergeParsedIntoCurrent(current, parsed || { itemName: joined })
      continue
    }

    // No open numbered row — keep measured lines that still look like BOQ items.
    if (parsed?.itemName) {
      const orphanNo = String(parsed.itemNo ?? "").trim()
      if (orphanNo || parsed.quantity != null || parsed.billRate != null || parsed.rate != null) {
        current = {
          itemNo: orphanNo,
          nameParts: [String(parsed.itemName).trim()].filter(Boolean),
          unit: parsed.unit || "",
          quantity: parsed.quantity ?? null,
          billRate: parsed.billRate ?? null,
          allowableRate: parsed.allowableRate ?? null,
          rate: parsed.rate ?? null,
        }
        flush()
      }
    }
  }

  flush()
  return items
}
