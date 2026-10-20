const FUEL_NAMES = [
  { key: "petrol", label: "Petrol" },
  { key: "diesel", label: "Diesel" },
  { key: "blend", label: "Blend" },
  { key: "oil", label: "Oil" },
]

export function extractFuelName(description) {
  const text = String(description || "").toLowerCase()
  for (const fuel of FUEL_NAMES) {
    if (new RegExp(`\\b${fuel.key}s?\\b`).test(text)) return fuel.label
  }
  return ""
}
