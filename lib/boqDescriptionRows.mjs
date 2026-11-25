function isStandaloneHeading(itemName) {
  const value = String(itemName ?? "").trim()
  if (/^(?:bill\s*no\.?\s*\d+|tj\s+associates|praz\s+head\s+office|roads\s+and\s+storm\s*water\s+drainage)\b/i.test(value)) {
    return true
  }
  return /[A-Z]/.test(value) && !/[a-z]/.test(value)
}

function hasBoqRowData(row) {
  return Boolean(row.itemNo) ||
    row.quantity != null ||
    row.rate != null ||
    row.billRate != null ||
    row.allowableRate != null
}

export function mergeBoqSourceDescriptionContinuations(rows) {
  const merged = []
  let previousItemIndex = null

  for (const row of rows ?? []) {
    if (!row?.itemName) {
      previousItemIndex = null
      continue
    }

    if (hasBoqRowData(row)) {
      merged.push(row)
      previousItemIndex = merged.length - 1
      continue
    }

    const itemName = String(row.itemName).trim()
    if (row.unit || isStandaloneHeading(itemName) || previousItemIndex === null) {
      previousItemIndex = null
      continue
    }

    const previous = merged[previousItemIndex]
    previous.itemName = `${String(previous.itemName).trim()} ${itemName}`.trim()
  }

  return merged
}
