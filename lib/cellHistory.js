function normalize(text) {
  return String(text ?? "").trim()
}

/**
 * Index of values previously entered per column. Formula columns remember the
 * formula (`${key}Formula`) rather than its answer.
 */
export function buildCellHistory(rows, columnKeys, descriptionKey = "description") {
  const history = {}
  for (const key of columnKeys) history[key] = new Map()

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue
    const description = normalize(row[descriptionKey]).toLowerCase()

    for (const key of columnKeys) {
      const value = normalize(row[`${key}Formula`]) || normalize(row[key])
      if (!value || /^0+(\.0+)?$/.test(value)) continue
      const id = value.toLowerCase()
      const entry = history[key].get(id) ?? { value, count: 0, descriptions: new Set() }
      entry.count += 1
      if (description) entry.descriptions.add(description)
      history[key].set(id, entry)
    }
  }

  return history
}

/** With `showAllWhenEmpty`, an empty cell lists every saved entry (most used first). */
export function searchCellHistory(
  history,
  columnKey,
  { query = "", description = "", limit = 12, showAllWhenEmpty = false } = {}
) {
  const typed = normalize(query).toLowerCase()
  const bucket = history?.[columnKey]
  if ((!typed && !showAllWhenEmpty) || !bucket) return []

  const descriptionKey = normalize(description).toLowerCase()

  return [...bucket.entries()]
    .filter(([id]) => !typed || (id !== typed && id.includes(typed)))
    .map(([id, entry]) => {
      const matchesDescription = Boolean(descriptionKey) && entry.descriptions.has(descriptionKey)
      return {
        value: entry.value,
        hint: matchesDescription ? "Used before for this description" : "",
        score:
          (id.startsWith(typed) ? 3 : 1) +
          (matchesDescription ? 2 : 0) +
          Math.min(entry.count, 10) * 0.1,
      }
    })
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
    .slice(0, limit)
}
