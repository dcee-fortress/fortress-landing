/**
 * Push local Supabase Postgres URLs to the linked Vercel project.
 * Usage: node scripts/sync-vercel-db-env.mjs
 * Requires: logged-in Vercel CLI (`npx vercel login`) and a linked project.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"

function loadEnv(path) {
  if (!fs.existsSync(path)) return {}
  const env = {}
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue
    const i = line.indexOf("=")
    if (i < 0) continue
    let value = line.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[line.slice(0, i)] = value
  }
  return env
}

function runVercel(args, input) {
  const result = spawnSync("npx", ["vercel", ...args], {
    input,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  })
  return result
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") }
const keys = ["DATABASE_URL", "DIRECT_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"]
const environments = ["production", "preview", "development"]

for (const key of keys) {
  const value = env[key]
  if (!value) {
    console.error(`Missing ${key} in .env`)
    process.exit(1)
  }
}

for (const key of keys) {
  const value = env[key]
  for (const target of environments) {
    // Remove existing value if present (ignore failures).
    runVercel(["env", "rm", key, target, "--yes"])
    const added = runVercel(["env", "add", key, target, "--sensitive"], `${value}\n`)
    if (added.status !== 0) {
      console.error(`Failed to set ${key} for ${target}`)
      console.error(added.stderr || added.stdout)
      process.exit(added.status || 1)
    }
    console.log(`Set ${key} (${target})`)
  }
}

console.log("Vercel database env updated. Redeploy production to apply.")
const deploy = runVercel(["deploy", "--prod", "--yes"])
console.log(deploy.stdout || deploy.stderr)
process.exit(deploy.status || 0)
