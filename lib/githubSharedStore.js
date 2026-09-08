function githubRepo() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER || "dcee-fortress"
  const slug = process.env.VERCEL_GIT_REPO_SLUG || "fortress-landing"
  return `${owner}/${slug}`
}

function githubRef() {
  return process.env.GROVE_SHARED_DATA_REF || "shared-data"
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.SHARED_STORAGE_GITHUB_TOKEN
}

const CACHE_MS = 5000

function githubCache() {
  if (!globalThis.__groveGithubStorageCache) {
    globalThis.__groveGithubStorageCache = { at: 0, data: null }
  }
  return globalThis.__groveGithubStorageCache
}

function parseSnapshot(parsed) {
  return parsed && typeof parsed === "object" && !parsed.error ? parsed : null
}

async function readGithubApiSnapshot() {
  const token = githubToken()
  if (!token) return null

  const repo = githubRepo()
  const ref = githubRef()
  const path = "data/grove-shared-storage.json"
  const api = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`

  const response = await fetch(api, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) return null

  const payload = await response.json()
  if (typeof payload.content !== "string") return null

  const decoded = Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8")
  return parseSnapshot(JSON.parse(decoded))
}

export async function readGithubSharedStore() {
  const cache = githubCache()
  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return cache.data
  }

  try {
    const fromApi = await readGithubApiSnapshot()
    if (fromApi) {
      cache.data = fromApi
      cache.at = Date.now()
      return fromApi
    }

    const repo = githubRepo()
    const ref = githubRef()
    const response = await fetch(
      `https://raw.githubusercontent.com/${repo}/${ref}/data/grove-shared-storage.json?t=${Date.now()}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
    if (!response.ok) return cache.data

    const parsed = parseSnapshot(await response.json())
    if (parsed) {
      cache.data = parsed
      cache.at = Date.now()
    }
    return parsed ?? cache.data
  } catch {
    return cache.data
  }
}

export async function writeGithubSharedStore(storage) {
  const token = githubToken()
  if (!token) return false

  const repo = githubRepo()
  const ref = githubRef()
  const path = "data/grove-shared-storage.json"
  const api = `https://api.github.com/repos/${repo}/contents/${path}`

  try {
    const current = await fetch(`${api}?ref=${ref}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
    const currentJson = current.ok ? await current.json() : {}
    const sha = typeof currentJson.sha === "string" ? currentJson.sha : undefined
    const content = Buffer.from(`${JSON.stringify(storage, null, 2)}\n`, "utf8").toString("base64")

    const response = await fetch(api, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Persist live Rodcroft project data for every device.",
        content,
        sha,
        branch: ref,
      }),
    })

    if (!response.ok) return false
    githubCache().data = storage
    githubCache().at = Date.now()
    return true
  } catch {
    return false
  }
}
