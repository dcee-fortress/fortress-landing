/**
 * BOQ row assembly by item numbering and lettered sub-items.
 * A new number (1.0, 1.1, 2.2, …) or letter bullet (a. b. c.) under that number
 * starts a new row — matching how the PDF shows each line.
 */

/** Hierarchical BOQ item no. followed by description text (not a lone quantity/rate). */
const ITEM_NO_WITH_TEXT = /(\d+(?:\.\d+)+)\s+(?=[A-Za-z(])/g
const ITEM_NO_ONLY = /^(\d+(?:\.\d+)+)$/
const ITEM_NO_AT_START = /^(\d+(?:\.\d+)+)\b/
/** Integer item nos only when clearly followed by a description word. */
const INTEGER_ITEM_AT_START = /^(\d{1,3})\s+(?=[A-Za-z(])/
/** Lettered sub-item: a. / b) / (c) at line start. */
const LETTER_BULLET_AT_START = /^([a-z])[.)]\s*/i
const LETTER_BULLET_WITH_TEXT = /(?:^|[\s;])([a-z])[.)]\s*(?=[A-Za-z(0-9])/gi

export function isBoqItemNumberToken(value) {
  return ITEM_NO_ONLY.test(String(value ?? "").trim())
}

export function matchBoqItemNumberAtStart(text) {
  const value = String(text ?? "").trim()
  if (!value) return null

  let match = value.match(ITEM_NO_AT_START)
  if (match) {
    return { itemNo: match[1], rest: value.slice(match[0].length).trim(), kind: "number" }
  }

  match = value.match(INTEGER_ITEM_AT_START)
  if (match) {
    return { itemNo: match[1], rest: value.slice(match[0].length).trim(), kind: "number" }
  }

  return null
}

export function matchLetterBulletAtStart(text) {
  const value = String(text ?? "").trim()
  if (!value) return null
  const match = value.match(LETTER_BULLET_AT_START)
  if (!match) return null
  return {
    letter: match[1].toLowerCase(),
    rest: value.slice(match[0].length).trim(),
    kind: "letter",
  }
}

/**
 * If a visual PDF/Excel line accidentally joined two numbered / lettered items, split them.
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

  LETTER_BULLET_WITH_TEXT.lastIndex = 0
  while ((match = LETTER_BULLET_WITH_TEXT.exec(joined)) !== null) {
    const at = match.index + (match[0].startsWith(" ") || match[0].startsWith(";") ? 1 : 0)
    if (!starts.includes(at)) starts.push(at)
  }

  starts.sort((a, b) => a - b)

  if (starts.length <= 1) {
    const first = String(cells?.[0] ?? "").trim()
    if (ITEM_NO_ONLY.test(first) || LETTER_BULLET_AT_START.test(first)) return [cells]
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
    !/\d+(?:\.\d+)+\s+[A-Za-z]/.test(text) &&
    !/\b[a-z][.)]\s+[A-Za-z]/.test(text)
  ) {
    return true
  }
  return false
}

/**
 * Expand a matrix so each physical source line that contains multiple item
 * numbers or letter bullets becomes multiple lines.
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

  const letter = matchLetterBulletAtStart(raw)
  if (letter && String(itemNo).toLowerCase().endsWith(letter.letter)) {
    return `${letter.letter}. ${letter.rest}`.replace(/\s+/g, " ").trim()
  }

  if (ITEM_NO_ONLY.test(raw)) return `${itemNo}`.trim()
  return raw
}

function mergeParsedIntoCurrent(current, parsed) {
  if (!current || !parsed) return current

  const extraName = String(parsed.itemName ?? "").replace(/\s+/g, " ").trim()
  if (extraName) {
    // Never fold a new letter bullet into the open row.
    if (matchLetterBulletAtStart(extraName)) return current
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
  let itemName = pickDescription({ itemName: body }, itemNo)
  if (!itemName) return null

  // Letter rows keep "a. …" in the description; bill no column holds 2.2a / a.
  if (current.letter && !/^[a-z][.)]\s/i.test(itemName)) {
    itemName = `${current.letter}. ${itemName}`.replace(/\s+/g, " ").trim()
  }

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

function resolveLetterItemNo(parentItemNo, letter) {
  const parent = String(parentItemNo ?? "").trim()
  const L = String(letter ?? "").toLowerCase()
  if (!L) return parent
  if (!parent) return L
  if (/[a-z]$/i.test(parent)) return `${parent.replace(/[a-z]+$/i, "")}${L}`
  return `${parent}${L}`
}

/**
 * Walk every line. New item number or letter bullet → new BOQ row.
 * Continuation lines (wrapped text) append into the open row until the next number/letter.
 *
 * @param {unknown[][]} matrix
 * @param {(cells: unknown[]) => object | null} parseLine
 */
export function assembleNumberedBoqItems(matrix, parseLine) {
  const lines = expandMatrixByItemNumbers(matrix)
  const items = []
  let current = null
  let parentItemNo = ""

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
    const parsedName = String(parsed?.itemName ?? "").trim()

    const numberStart =
      matchBoqItemNumberAtStart(firstCell) ||
      (ITEM_NO_ONLY.test(firstCell) ? { itemNo: firstCell, rest: "", kind: "number" } : null) ||
      matchBoqItemNumberAtStart(joined) ||
      (isBoqItemNumberToken(parsedItemNo) ? { itemNo: parsedItemNo, rest: "", kind: "number" } : null) ||
      matchBoqItemNumberAtStart(parsedName)

    const letterStart =
      matchLetterBulletAtStart(firstCell) ||
      matchLetterBulletAtStart(joined) ||
      matchLetterBulletAtStart(parsedName)

    // Hierarchical bill number (2.2, 2.4, …) opens a new parent row.
    if (numberStart?.itemNo) {
      flush()
      parentItemNo = numberStart.itemNo
      const fromParse = matchBoqItemNumberAtStart(parsedName)
      const description =
        numberStart.rest ||
        (fromParse ? fromParse.rest : "") ||
        (parsedName && !ITEM_NO_ONLY.test(parsedName) && !matchLetterBulletAtStart(parsedName)
          ? parsedName
          : "") ||
        ""

      current = {
        itemNo: numberStart.itemNo,
        letter: "",
        nameParts: description ? [description] : [],
        unit: parsed?.unit || "",
        quantity: parsed?.quantity ?? null,
        billRate: parsed?.billRate ?? null,
        allowableRate: parsed?.allowableRate ?? null,
        rate: parsed?.rate ?? null,
      }

      if (!description && parsedName && !isBoqItemNumberToken(parsedName) && !matchLetterBulletAtStart(parsedName)) {
        current.nameParts.push(parsedName)
      }
      continue
    }

    // Lettered sub-item (a. b. c.) under the open bill number — own row, as on the PDF.
    if (letterStart?.letter) {
      flush()
      const itemNo = resolveLetterItemNo(parentItemNo, letterStart.letter)
      const description =
        letterStart.rest ||
        (matchLetterBulletAtStart(parsedName)?.rest ?? "") ||
        ""

      current = {
        itemNo,
        letter: letterStart.letter,
        nameParts: description ? [description] : [],
        unit: parsed?.unit || "",
        quantity: parsed?.quantity ?? null,
        billRate: parsed?.billRate ?? null,
        allowableRate: parsed?.allowableRate ?? null,
        rate: parsed?.rate ?? null,
      }
      continue
    }

    if (current) {
      mergeParsedIntoCurrent(current, parsed || { itemName: joined })
      continue
    }

    if (parsed?.itemName) {
      const orphanNo = String(parsed.itemNo ?? "").trim()
      if (orphanNo || parsed.quantity != null || parsed.billRate != null || parsed.rate != null) {
        current = {
          itemNo: orphanNo,
          letter: "",
          nameParts: [String(parsed.itemName).trim()].filter(Boolean),
          unit: parsed.unit || "",
          quantity: parsed.quantity ?? null,
          billRate: parsed.billRate ?? null,
          allowableRate: parsed.allowableRate ?? null,
          rate: parsed.rate ?? null,
        }
        if (orphanNo && !/[a-z]$/i.test(orphanNo)) parentItemNo = orphanNo
        flush()
      }
    }
  }

  flush()
  return items
}

/** Bill No. shown in the template — lettered children show as a / b / c when stored as 2.2a. */
export function formatBoqBillNumber(itemNo) {
  const value = String(itemNo ?? "").trim()
  if (!value) return ""
  const letterOnly = value.match(/^(\d+(?:\.\d+)*)([a-z])$/i)
  if (letterOnly) return letterOnly[2].toLowerCase()
  return value
}
