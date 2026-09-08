import fs from "node:fs"
import path from "node:path"

const LIVE_URL =
  process.env.SHARED_STORAGE_URL || "https://rodcroft-fortress.vercel.app/api/shared-storage"
const GITHUB_SNAPSHOT_URL =
  process.env.GROVE_SHARED_SNAPSHOT_URL ||
  "https://raw.githubusercontent.com/dcee-fortress/fortress-landing/shared-data/data/grove-shared-storage.json"
const OUT_FILE = path.join("data", "grove-shared-storage.json")

function parseObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value
}

function parseJsonObject(value) {
  if (typeof value !== "string" || !value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function mergeKeyed(existing, incoming) {
  const result = { ...existing }
  for (const [key, incomingValue] of Object.entries(incoming)) {
    const previous = result[key]
    if (
      previous &&
      incomingValue &&
      typeof previous === "object" &&
      typeof incomingValue === "object" &&
      !Array.isArray(previous) &&
      !Array.isArray(incomingValue)
    ) {
      result[key] = { ...previous, ...incomingValue }
    } else {
      result[key] = incomingValue
    }
  }
  return result
}

function mergeRegistry(existingValue, incomingValue) {
  const existing = parseJsonObject(existingValue) || { projects: [], files: {} }
  const incoming = parseJsonObject(incomingValue) || { projects: [], files: {} }
  const projectsById = new Map()
  for (const project of existing.projects || []) {
    if (project?.id) projectsById.set(project.id, project)
  }
  for (const project of incoming.projects || []) {
    if (project?.id) {
      projectsById.set(project.id, { ...(projectsById.get(project.id) || {}), ...project })
    }
  }
  return JSON.stringify({
    ...existing,
    ...incoming,
    projects: [...projectsById.values()],
    files: mergeKeyed(existing.files || {}, incoming.files || {}),
  })
}

function mergeStores(existing = {}, incoming = {}) {
  const merged = { ...existing }
  for (const [key, incomingValue] of Object.entries(incoming)) {
    if (typeof incomingValue !== "string") continue
    if (typeof merged[key] !== "string") {
      merged[key] = incomingValue
      continue
    }
    if (key === "grove-projects-registry") {
      merged[key] = mergeRegistry(merged[key], incomingValue)
      continue
    }
    const existingObject = parseJsonObject(merged[key])
    const incomingObject = parseJsonObject(incomingValue)
    if (existingObject && incomingObject) {
      merged[key] = JSON.stringify(mergeKeyed(existingObject, incomingObject))
    } else if (incomingValue.length >= merged[key].length) {
      merged[key] = incomingValue
    }
  }
  return merged
}

async function fetchJson(url) {
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
      cache: "no-store",
    })
    if (!response.ok) return {}
    const parsed = await response.json()
    if (parsed?.error && !parsed["grove-projects-registry"]) return {}
    return parseObject(parsed)
  } catch {
    return {}
  }
}

async function main() {
  const local = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : {}
  const [live, github] = await Promise.all([fetchJson(LIVE_URL), fetchJson(GITHUB_SNAPSHOT_URL)])
  const merged = mergeStores(mergeStores(local, github), live)
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  const next = `${JSON.stringify(merged, null, 2)}\n`
  const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : ""
  if (next === previous) {
    console.log("Shared storage is already up to date.")
    return
  }
  fs.writeFileSync(OUT_FILE, next)
  console.log("Updated", OUT_FILE)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
