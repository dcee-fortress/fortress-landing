import { LIVE_SHARED_STORAGE_URL } from '@/lib/liveDataConfig'
import { normalizeMaterialScheduleRows } from '@/lib/materialSchedule'
import { overviewForConstructionProject } from './fortressMetadata'

export const LIVE_CHADCOMBE_PROJECT_ID = 'p-1789313935790'
export const LIVE_RODCROFT_ORIGIN = 'https://rodcroft-fortress.vercel.app'

function parseStored(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(cleaned) ? cleaned : 0
}

function rowsForProject(store, projectId) {
  if (!store || typeof store !== 'object' || !projectId) return []
  const prefix = `${projectId}::`
  const rows = []
  for (const [key, value] of Object.entries(store)) {
    if (!key.startsWith(prefix) || !Array.isArray(value)) continue
    rows.push(...value.filter((row) => row && typeof row === 'object'))
  }
  return rows
}

function peopleFromRegister(store, projectId, register) {
  const people = []
  const seen = new Set()
  for (const row of rowsForProject(store, projectId)) {
    const name = String(row.name || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    people.push({
      id: row.id || `${register}-${key}`,
      name,
      role: String(row.role || row.trade || '').trim(),
      register,
    })
  }
  return people
}

function sumByDescription(rows, quantityKey) {
  const map = new Map()
  for (const row of rows) {
    const description = String(row.description || row.activityDescription || '').trim()
    if (!description) continue
    const current = map.get(description.toLowerCase()) || {
      description,
      unit: String(row.unit || '').trim(),
      quantity: 0,
    }
    current.quantity += parseAmount(row[quantityKey] ?? row.quantity)
    if (!current.unit && row.unit) current.unit = String(row.unit)
    map.set(description.toLowerCase(), current)
  }
  return map
}

export async function fetchLiveChadcombeOverview() {
  const response = await fetch(LIVE_SHARED_STORAGE_URL, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Live Rodcroft data failed (${response.status})`)
  const payload = await response.json()

  const registry = parseStored(payload['grove-projects-registry'], { projects: [] })
  const projects = Array.isArray(registry?.projects) ? registry.projects : []
  const project =
    projects.find((item) => item?.id === LIVE_CHADCOMBE_PROJECT_ID) ||
    projects.find((item) => /chadcombe/i.test(String(item?.name || ''))) ||
    { id: LIVE_CHADCOMBE_PROJECT_ID, name: 'Chadcombe' }

  const schedules = parseStored(payload['grove-material-schedules'], {})
  const valuationMap = new Map()
  let fuelConsumedLiters = 0
  let fuelConsumedCost = 0
  const prefix = `${project.id}::`
  for (const [key, rows] of Object.entries(schedules || {})) {
    if (!key.startsWith(prefix) || !key.endsWith('::value-earned') || !Array.isArray(rows)) continue
    for (const row of normalizeMaterialScheduleRows(rows)) {
      const description = String(row.activityDescription || '').trim()
      const valueEarned = parseAmount(row.totalCost)
      const production = parseAmount(row.resolvedProduction ?? row.production)
      if (!description || (!valueEarned && !production)) continue
      const current = valuationMap.get(description.toLowerCase()) || {
        id: `live-${description.toLowerCase()}`,
        description,
        valueEarned: 0,
        production: 0,
      }
      current.valueEarned += valueEarned
      current.production += production
      valuationMap.set(description.toLowerCase(), current)
      fuelConsumedLiters += parseAmount(row.fuelAllocated)
      fuelConsumedCost += parseAmount(row.fuelCost)
    }
  }

  const requested = sumByDescription(
    rowsForProject(parseStored(payload['grove-bulk-material-request'], {}), project.id),
    'quantity',
  )
  const received = sumByDescription(
    rowsForProject(parseStored(payload['grove-material-receipts'], {}), project.id),
    'quantity',
  )
  const materialNames = new Set([...requested.keys(), ...received.keys()])
  const materialAnalysis = [...materialNames].map((key) => {
    const request = requested.get(key)
    const receipt = received.get(key)
    const requestedQuantity = request?.quantity || 0
    const receivedQuantity = receipt?.quantity || 0
    return {
      id: `live-ma-${key}`,
      description: request?.description || receipt?.description || key,
      unit: request?.unit || receipt?.unit || '',
      requestedQuantity,
      receivedQuantity,
      materialLeft: requestedQuantity - receivedQuantity,
      broughtOnSite: receivedQuantity,
      materialUsed: 0,
      onSiteLeft: receivedQuantity,
    }
  })

  const workers = [
    ...peopleFromRegister(parseStored(payload['grove-site-staff-registers'], {}), project.id, 'admin'),
    ...peopleFromRegister(parseStored(payload['grove-plant-operator-registers'], {}), project.id, 'operators'),
    ...peopleFromRegister(parseStored(payload['grove-induction-registers'], {}), project.id, 'induction'),
    ...peopleFromRegister(parseStored(payload['grove-labor-registers'], {}), project.id, 'induction'),
  ]

  const rawProject = {
    id: LIVE_CHADCOMBE_PROJECT_ID,
    name: 'Chadcombe',
    code: 'RC-CHD-01',
    location: project.location || 'Chadcombe, Harare',
    manager: project.manager || 'Blessing Mujeri',
    status: project.status || 'active',
    startDate: project.startDate || '2026-09-13',
    summary:
      'Live Chadcombe project from rodcroft.fortress.vercel.app — valuations, materials, fuel, and workers saved on the site.',
    valuations: [...valuationMap.values()],
    materialAnalysis,
    workers,
    fuel: {
      bulkInsertedLiters: 0,
      bulkInsertedCost: 0,
      entries: fuelConsumedLiters || fuelConsumedCost
        ? [
            {
              id: 'live-fuel',
              description: 'Diesel',
              unit: 'L',
              quantity: Math.round(fuelConsumedLiters * 100) / 100,
              totalCost: Math.round(fuelConsumedCost * 100) / 100,
            },
          ]
        : [],
    },
  }

  return overviewForConstructionProject(rawProject, {
    companyName: 'Rodcroft',
    slug: 'rodcroft',
    subdomain: 'rodcroft.fortress.vercel.app',
    location: 'Harare, Zimbabwe',
    ceo: 'Mbizvo Rodcroft',
  })
}
