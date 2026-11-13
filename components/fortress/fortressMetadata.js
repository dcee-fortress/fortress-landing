import { storage } from './storage'

export const FORTRESS_SUBDOMAIN_ROOT = 'fortress.vercel.app'
export const CEO_METADATA_STORAGE_KEY = 'fortress-ceo-metadata-v4'
export const RODCROFT_CHADCOMBE_PROJECT_ID = 'p-1789313935790'

export const cleanSlug = (value = '') =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'company'

export const subdomainLabelFor = (slugOrSite) => {
  const rawSlug =
    typeof slugOrSite === 'string'
      ? slugOrSite
      : slugOrSite?.subdomain ||
        slugOrSite?.slug ||
        slugOrSite?.catalogId ||
        slugOrSite?.name ||
        'company'
  const slug = cleanSlug(
    String(rawSlug)
      .replace(/^site-/, '')
      .replace(/\.fortress\.vercel\.app$/i, '')
      .replace(/\.vercel\.app$/i, ''),
  )
  if (slug === 'prixburg') return 'prixburg.vercel.app'
  return `${slug}.${FORTRESS_SUBDOMAIN_ROOT}`
}

export const subdomainUrlFor = (slugOrSite) => `https://${subdomainLabelFor(slugOrSite)}`

/**
 * Detects if the current browser request is on a tenant subdomain of Fortress
 * such as `rodcroft.fortress.vercel.app`, `prixburg.fortress.vercel.app`,
 * `<slug>.fortress.vercel.app`, `<slug>.localhost`, or `?subdomain=<slug>`.
 */
export const detectActiveSubdomain = () => {
  if (typeof window === 'undefined') return ''

  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('subdomain') || params.get('site') || params.get('tenant')
    if (fromQuery) return cleanSlug(fromQuery)
  } catch {
    /* ignore */
  }

  const host = String(window.location.hostname || '')
    .toLowerCase()
    .trim()

  if (!host || host === 'localhost' || host === '127.0.0.1') return ''

  // Legacy aliases map cleanly to their tenant slugs
  if (host === 'rodcroft-fortress.vercel.app' || host === 'rodcroft.vercel.app') {
    return 'rodcroft'
  }
  if (host === 'prixburg.vercel.app' || host === 'prixburg-fortress.vercel.app') {
    return 'prixburg'
  }

  // Match <slug>.fortress.vercel.app
  if (host.endsWith(`.${FORTRESS_SUBDOMAIN_ROOT}`)) {
    const sub = host.slice(0, -`.${FORTRESS_SUBDOMAIN_ROOT}`.length)
    if (sub && sub !== 'www' && !sub.includes('.')) {
      return cleanSlug(sub)
    }
  }

  // Match <slug>.localhost for local tenant subdomain testing
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length)
    if (sub && sub !== 'www' && !sub.includes('.')) {
      return cleanSlug(sub)
    }
  }

  return ''
}

/**
 * Exact live valuation activities from Rodcroft Chadcombe (`p-1789313935790`)
 */
export const RODCROFT_CHADCOMBE_VALUATIONS = [
  { id: 'val-1', description: 'Hauling of gravel', valueEarned: 151040.7, production: 7371 },
  { id: 'val-2', description: 'Road processing and compaction', valueEarned: 68412.45, production: 14820 },
  { id: 'val-3', description: 'Hauling of waste', valueEarned: 23713.0, production: 7739 },
  { id: 'val-4', description: 'Hauling of crusher run', valueEarned: 19485.3, production: 1265 },
  { id: 'val-5', description: 'Shanting', valueEarned: 7878.5, production: 533 },
  { id: 'val-6', description: 'Laying pavers', valueEarned: 5019.96, production: 4749.78 },
  { id: 'val-7', description: 'Laying pavers and 250 micron sheeting and sand bedding quarry dust for pavers', valueEarned: 3017.47, production: 2367.16 },
  { id: 'val-8', description: 'Backfilling porous pipes', valueEarned: 1902.88, production: 1233.2 },
  { id: 'val-9', description: 'Backfilling storm water', valueEarned: 1539.73, production: 862.52 },
  { id: 'val-10', description: 'Excavation for subsurface drainage system', valueEarned: 1130.42, production: 652.14 },
  { id: 'val-11', description: 'Laying hollow mountable kerbs', valueEarned: 1057.88, production: 363.3 },
  { id: 'val-12', description: 'Backfilling storm water drainage', valueEarned: 965.6, production: 320.16 },
  { id: 'val-13', description: 'Excavation for subsurface drainage', valueEarned: 758.53, production: 211.6 },
  { id: 'val-14', description: 'Cartaway waste for hauling', valueEarned: 692.69, production: 689 },
  { id: 'val-15', description: 'Filter material', valueEarned: 655.73, production: 216.25 },
  { id: 'val-16', description: 'Surface bedding', valueEarned: 511.6, production: 225.8 },
  { id: 'val-17', description: 'Excavation for storm water', valueEarned: 497.31, production: 90.62 },
  { id: 'val-18', description: 'Bricks transportation', valueEarned: 377.43, production: 704 },
  { id: 'val-19', description: 'Laying and filter material of subsurface drainage', valueEarned: 243.88, production: 21 },
  { id: 'val-20', description: 'Laying hollow mountable kerbs corrections', valueEarned: 169.4, production: 54.7 },
  { id: 'val-21', description: '250 micron sheeting and sand bedding quarry dust for pavers', valueEarned: 165.1, production: 352.5 },
  { id: 'val-22', description: 'Sand bedding quarry dust for pavers', valueEarned: 156.0, production: 378 },
]

/**
 * Exact live Material Analysis & Storeroom rows from Rodcroft Chadcombe (`p-1789313935790`)
 */
export const RODCROFT_CHADCOMBE_MATERIAL_ANALYSIS = [
  { id: 'ma-1', description: '13 mm Stones', unit: 'm3', requestedQuantity: 1000, receivedQuantity: 469, materialLeft: 531, broughtOnSite: 469, materialUsed: 200, onSiteLeft: 269 },
  { id: 'ma-2', description: '160 mm perforated', unit: 'm', requestedQuantity: 2000, receivedQuantity: 1992, materialLeft: 8, broughtOnSite: 1992, materialUsed: 1477, onSiteLeft: 515 },
  { id: 'ma-3', description: '19 mm stones', unit: 'm3', requestedQuantity: 50, receivedQuantity: 13, materialLeft: 37, broughtOnSite: 13, materialUsed: 10, onSiteLeft: 3 },
  { id: 'ma-4', description: '250 mm perforated', unit: 'm', requestedQuantity: 1600, receivedQuantity: 1524, materialLeft: 76, broughtOnSite: 1524, materialUsed: 1500, onSiteLeft: 24 },
  { id: 'ma-5', description: '315mm Pipes', unit: 'm', requestedQuantity: 354, receivedQuantity: 354, materialLeft: 0, broughtOnSite: 354, materialUsed: 200, onSiteLeft: 154 },
  { id: 'ma-6', description: '600mm Culverts', unit: 'm', requestedQuantity: 3544, receivedQuantity: 1321, materialLeft: 2223, broughtOnSite: 1321, materialUsed: 1000, onSiteLeft: 321 },
  { id: 'ma-7', description: 'Black sheeting (250 micron)', unit: 'rolls', requestedQuantity: 20, receivedQuantity: 20, materialLeft: 0, broughtOnSite: 20, materialUsed: 15, onSiteLeft: 5 },
  { id: 'ma-8', description: 'Brick force', unit: 'rolls', requestedQuantity: 15, receivedQuantity: 15, materialLeft: 0, broughtOnSite: 15, materialUsed: 13, onSiteLeft: 2 },
  { id: 'ma-9', description: 'Cement', unit: 'bags', requestedQuantity: 41, receivedQuantity: 41, materialLeft: 0, broughtOnSite: 41, materialUsed: 31, onSiteLeft: 10 },
  { id: 'ma-10', description: 'Cracking agent', unit: 'm3', requestedQuantity: 26, receivedQuantity: 20, materialLeft: 6, broughtOnSite: 26, materialUsed: 21, onSiteLeft: 5 },
  { id: 'ma-11', description: 'Crusher run', unit: 'm3', requestedQuantity: 8000, receivedQuantity: 3744, materialLeft: 4256, broughtOnSite: 3744, materialUsed: 1200, onSiteLeft: 2544 },
  { id: 'ma-12', description: 'Dust toade', unit: 'm3', requestedQuantity: 1000, receivedQuantity: 895, materialLeft: 105, broughtOnSite: 895, materialUsed: 290, onSiteLeft: 605 },
  { id: 'ma-13', description: 'H7 Municipal Kerbs', unit: 'm', requestedQuantity: 5533, receivedQuantity: 807, materialLeft: 4726, broughtOnSite: 807, materialUsed: 450, onSiteLeft: 357 },
  { id: 'ma-14', description: 'Hollow mountable kerbs', unit: 'm', requestedQuantity: 9396, receivedQuantity: 2639, materialLeft: 6757, broughtOnSite: 2639, materialUsed: 350, onSiteLeft: 2289 },
  { id: 'ma-15', description: 'Impermo', unit: 'kg', requestedQuantity: 20, receivedQuantity: 20, materialLeft: 0, broughtOnSite: 20, materialUsed: 18, onSiteLeft: 2 },
  { id: 'ma-16', description: 'Pavers', unit: 'no', requestedQuantity: 705000, receivedQuantity: 70500, materialLeft: 634500, broughtOnSite: 70500, materialUsed: 40000, onSiteLeft: 30500 },
  { id: 'ma-17', description: 'Polyethene (4000m2)', unit: 'no', requestedQuantity: 17, receivedQuantity: 10, materialLeft: 7, broughtOnSite: 10, materialUsed: 7, onSiteLeft: 3 },
]

/**
 * Exact live Workers registers from Rodcroft Chadcombe (`p-1789313935790`)
 */
export const RODCROFT_CHADCOMBE_WORKERS = [
  // Site Staff (Admin)
  { id: 'w-staff-1', name: 'Blessing Mujeri', role: 'Engineer', register: 'admin', presentDays: 24 },
  { id: 'w-staff-2', name: 'Normore', role: 'Engineer', register: 'admin', presentDays: 20 },
  { id: 'w-staff-3', name: 'Madzivanzira', role: 'Foreman', register: 'admin', presentDays: 24 },
  { id: 'w-staff-4', name: 'Kudakwashe Mutaramutswatswa', role: 'Mechanics', register: 'admin', presentDays: 22 },
  { id: 'w-staff-5', name: 'Tafadzwa', role: 'Mechanics', register: 'admin', presentDays: 23 },
  { id: 'w-staff-6', name: 'T Machazani', role: 'Clerk', register: 'admin', presentDays: 24 },
  { id: 'w-staff-7', name: 'Pride Chari', role: 'QS', register: 'admin', presentDays: 24 },
  { id: 'w-staff-8', name: 'Adrian Muchemwa', role: 'SHE R', register: 'admin', presentDays: 23 },
  { id: 'w-staff-9', name: 'Ishmael Chisango', role: 'QS', register: 'admin', presentDays: 24 },
  { id: 'w-staff-10', name: 'Joana Mbizvo', role: 'SHER', register: 'admin', presentDays: 24 },
  { id: 'w-staff-11', name: 'M Mashanda', role: 'SHE R', register: 'admin', presentDays: 22 },
  { id: 'w-staff-12', name: 'Magaisa V', role: 'LOC', register: 'admin', presentDays: 23 },
  { id: 'w-staff-13', name: 'Desire Mudede', role: 'Engineer', register: 'admin', presentDays: 24 },
  { id: 'w-staff-14', name: 'Pride Musimwa', role: 'Site Staff', register: 'admin', presentDays: 22 },
  { id: 'w-staff-15', name: 'Gibson K', role: 'Foreman', register: 'admin', presentDays: 23 },
  { id: 'w-staff-16', name: 'Darel Chitukutuku', role: 'QS + Software Architect', register: 'admin', presentDays: 24 },
  { id: 'w-staff-17', name: 'Pride Mufahore', role: 'Site Staff', register: 'admin', presentDays: 21 },
  // Plant Operators
  { id: 'w-op-1', name: 'Tawanda', role: 'Operator', plant: 'Bowser (Rodcroft)', register: 'operators', presentDays: 22 },
  { id: 'w-op-2', name: 'Muzeya', role: 'Operator', plant: 'Bowser (Toru)', register: 'operators', presentDays: 21 },
  { id: 'w-op-3', name: 'Trymore', role: 'Operator', plant: 'Excavator (Rodcroft)', register: 'operators', presentDays: 23 },
  { id: 'w-op-4', name: 'Reegis', role: 'Operator', plant: 'Excavator (Steffcon)', register: 'operators', presentDays: 22 },
  { id: 'w-op-5', name: 'Chirinda', role: 'Operator', plant: 'Grader (Rodcroft)', register: 'operators', presentDays: 23 },
  { id: 'w-op-6', name: 'Munya', role: 'Operator', plant: 'Grader (Tirosh)', register: 'operators', presentDays: 22 },
  { id: 'w-op-7', name: 'Gezani', role: 'Operator', plant: 'Grid Roller / T.L.B', register: 'operators', presentDays: 23 },
  { id: 'w-op-8', name: 'Simba', role: 'Operator', plant: 'Roller (Steffcon)', register: 'operators', presentDays: 22 },
  { id: 'w-op-9', name: 'Reno', role: 'Operator', plant: 'Roller (Rodcroft)', register: 'operators', presentDays: 22 },
  { id: 'w-op-10', name: 'Marc', role: 'Operator', plant: 'T.L.B (Steffcon)', register: 'operators', presentDays: 21 },
  { id: 'w-op-11', name: 'Anderson', role: 'Operator', plant: 'T.L.B (Faraday)', register: 'operators', presentDays: 21 },
  { id: 'w-op-12', name: 'Vanmark', role: 'Operator', plant: 'Grabber (Tirosh)', register: 'operators', presentDays: 20 },
  // Induction Register
  { id: 'w-ind-1', name: 'Nathan Seremani', role: 'Paver', register: 'induction', presentDays: 22 },
  { id: 'w-ind-2', name: 'Reggies Sakarombe', role: 'Pavers', register: 'induction', presentDays: 22 },
  { id: 'w-ind-3', name: 'Tanaka Nyakunda', role: 'Pavers', register: 'induction', presentDays: 21 },
  { id: 'w-ind-4', name: 'Shadreck Mutoko', role: 'Pavers', register: 'induction', presentDays: 22 },
  { id: 'w-ind-5', name: 'Alouis Mujuru', role: 'Kerbing', register: 'induction', presentDays: 22 },
  { id: 'w-ind-6', name: 'Takudzwa Mupandasekwa', role: 'Kerbing', register: 'induction', presentDays: 21 },
  { id: 'w-ind-7', name: 'Kudzai Gware', role: 'Paving', register: 'induction', presentDays: 22 },
  { id: 'w-ind-8', name: 'Steward Makaza', role: 'Paving', register: 'induction', presentDays: 22 },
  { id: 'w-ind-9', name: 'Prince Muswere', role: 'Paving', register: 'induction', presentDays: 21 },
  { id: 'w-ind-10', name: 'Gamuchirai Pilolo', role: 'Site Crew', register: 'induction', presentDays: 20 },
  { id: 'w-ind-11', name: 'Andrew Mubvumbi', role: 'Pavers', register: 'induction', presentDays: 22 },
  { id: 'w-ind-12', name: 'Tinotenda Makure', role: 'Pavers', register: 'induction', presentDays: 22 },
  { id: 'w-ind-13', name: 'Clayton Sibosiso', role: 'Pavers', register: 'induction', presentDays: 21 },
  { id: 'w-ind-14', name: 'Task Munhanga', role: 'Pavers', register: 'induction', presentDays: 21 },
  { id: 'w-ind-15', name: 'Tadiwanashe Takawira', role: 'Pavers', register: 'induction', presentDays: 20 },
  { id: 'w-ind-16', name: 'Tanatswa Mawere', role: 'Pavers', register: 'induction', presentDays: 20 },
]

/**
 * Exact live Fuel Consumed entries from Rodcroft Chadcombe (`p-1789313935790`)
 */
export const RODCROFT_CHADCOMBE_FUEL_ENTRIES = [
  { id: 'gr-1', date: '2026-11-01', description: 'Diesel', unit: 'L', quantity: 959, unitPrice: 2.05, totalCost: 1965.95 },
  { id: 'gr-2', date: '2026-10-31', description: 'Diesel', unit: 'L', quantity: 787, unitPrice: 2.05, totalCost: 1613.35 },
  { id: 'gr-3', date: '2026-10-30', description: 'Diesel', unit: 'L', quantity: 1676, unitPrice: 2.04, totalCost: 3419.04 },
  { id: 'gr-4', date: '2026-10-30', description: 'Petrol', unit: 'L', quantity: 20, unitPrice: 2.05, totalCost: 41.0 },
  { id: 'gr-5', date: '2026-10-29', description: 'Diesel', unit: 'L', quantity: 1021, unitPrice: 2.04, totalCost: 2082.84 },
  { id: 'gr-6', date: '2026-10-27', description: 'Diesel', unit: 'L', quantity: 530, unitPrice: 2.04, totalCost: 1081.2 },
  { id: 'gr-7', date: '2026-10-27', description: 'Petrol', unit: 'L', quantity: 15, unitPrice: 2.05, totalCost: 30.75 },
  { id: 'gr-8', date: '2026-10-26', description: 'Diesel', unit: 'L', quantity: 839.02, unitPrice: 2.04, totalCost: 1711.6 },
  { id: 'gr-9', date: '2026-10-26', description: 'Petrol', unit: 'L', quantity: 15, unitPrice: 2.05, totalCost: 30.75 },
  { id: 'gr-10', date: '2026-10-03', description: 'Diesel', unit: 'L', quantity: 190, unitPrice: 2.08, totalCost: 395.2 },
  { id: 'gr-11', date: '2026-10-03', description: 'Petrol', unit: 'L', quantity: 20, unitPrice: 2.06, totalCost: 41.2 },
  { id: 'gr-12', date: '2026-10-02', description: 'Diesel', unit: 'L', quantity: 405, unitPrice: 2.08, totalCost: 842.4 },
  { id: 'gr-13', date: '2026-10-02', description: 'Petrol', unit: 'L', quantity: 20, unitPrice: 2.06, totalCost: 41.2 },
  { id: 'gr-14', date: '2026-10-01', description: 'Diesel', unit: 'L', quantity: 470, unitPrice: 2.08, totalCost: 977.6 },
  { id: 'gr-15', date: '2026-10-01', description: 'Blend', unit: 'L', quantity: 20, unitPrice: 2.06, totalCost: 41.2 },
]

export const DEFAULT_RODCROFT_METADATA = {
  slug: 'rodcroft',
  subdomain: 'rodcroft.fortress.vercel.app',
  template: 'rodcroft',
  systemType: 'construction',
  isSeededTenant: true,
  companyName: 'Rodcroft',
  brandName: 'Rodcroft',
  ceo: 'Mbizvo Rodcroft',
  location: 'Harare, Zimbabwe',
  about:
    'Construction earned-value reporting and project dashboards. Live tenant of Fortress.',
  hue: '#9a3412',
  credentials: {
    engineeringUsername: 'Engineer',
    engineeringPassword: 'Rodcroftengineer',
    masterUsername: 'Rodcroft',
    masterPassword: 'Rodcroft@2026',
  },
  projects: [
    {
      id: 'p-1789313935790',
      name: 'Chadcombe',
      code: 'RC-CHD-01',
      location: 'Chadcombe, Harare',
      client: 'Rodcroft Civil Engineering',
      manager: 'Blessing Mujeri',
      status: 'active',
      startDate: '2026-09-13',
      endDate: null,
      summary:
        'Subsurface drainage, stormwater culverts, road processing & compaction, hauling of crusher run and gravel, kerbing, and paving works at Chadcombe.',
      valuations: RODCROFT_CHADCOMBE_VALUATIONS,
      materialAnalysis: RODCROFT_CHADCOMBE_MATERIAL_ANALYSIS,
      workers: RODCROFT_CHADCOMBE_WORKERS,
      fuel: {
        bulkInsertedLiters: 1000,
        bulkInsertedCost: 1960,
        entries: RODCROFT_CHADCOMBE_FUEL_ENTRIES,
      },
      sheqReports: [
        {
          id: 'sheq-1',
          date: '2026-10-01',
          type: 'SHEQ Site Inspection Report',
          status: 'Saved',
          highlight: 'Chadcombe site inspection and weekly SHEQ compliance verified by Adrian Muchemwa & Joana Mbizvo.',
          incidents: 0,
        },
        {
          id: 'sheq-2',
          date: '2026-09-29',
          type: 'THE SHEQ WEEKLY REPORT',
          status: 'Saved',
          highlight: 'Plant operators, pavers, and kerbing crews inducted and PPE verified on site.',
          incidents: 0,
        },
      ],
    },
  ],
}

export const DEFAULT_PRIXBURG_METADATA = {
  slug: 'prixburg',
  subdomain: 'prixburg.vercel.app',
  template: 'prixburg',
  systemType: 'manufacturing',
  isSeededTenant: true,
  companyName: 'Prixburg',
  brandName: 'Prixburg',
  ceo: 'Tawanda Chitukutuku',
  location: 'Harare, Zimbabwe',
  about:
    'Prixburg is a chemical manufacturing factory. Fortress tracks storeroom materials, consumed stock, and sales of dishwasher, toilet cleaner, and fabric softener.',
  hue: '#1f4d45',
  credentials: {
    mainUsername: 'CLEANZ',
    mainPassword: 'CLEANZ123',
    settingsUsername: 'PRIXBURG CHEMICALS',
    settingsPassword: 'Prixburg',
  },
  rawMaterials: [
    { id: 'rm-1', date: '2026-11-01', name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', unit: 'kg', quantity: 420, qtyFormula: '420', unitCost: 2.4 },
    { id: 'rm-2', date: '2026-11-01', name: 'Sulphonic Acid (LABSA 96%)', unit: 'kg', quantity: 310, qtyFormula: '310', unitCost: 2.15 },
    { id: 'rm-3', date: '2026-11-02', name: 'Caustic Soda Pearls', unit: 'kg', quantity: 180, qtyFormula: '180', unitCost: 1.5 },
    { id: 'rm-4', date: '2026-11-02', name: 'Cocoamidopropyl Betaine (CAPB)', unit: 'kg', quantity: 140, qtyFormula: '140', unitCost: 2.8 },
    { id: 'rm-5', date: '2026-11-03', name: 'Hydrochloric Acid 32%', unit: 'L', quantity: 260, qtyFormula: '260', unitCost: 1.1 },
    { id: 'rm-6', date: '2026-11-03', name: 'Cationic Softener Flakes', unit: 'kg', quantity: 195, qtyFormula: '195', unitCost: 3.2 },
    { id: 'rm-7', date: '2026-11-04', name: 'Industrial Perfume (Lemon / Pine / Fresh)', unit: 'L', quantity: 45, qtyFormula: '45', unitCost: 14.0 },
    { id: 'rm-8', date: '2026-11-04', name: 'Industrial Dye', unit: 'kg', quantity: 22, qtyFormula: '22', unitCost: 18.0 },
  ],
  detergentFormulas: [
    {
      id: 'formula-dishwasher',
      name: 'Dishwasher',
      production: 200,
      unit: 'L',
      createdAt: '2026-10-15T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-1', name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', unit: 'kg', amount: 24, qtyFormula: '24', unitPrice: 2.4 },
        { id: 'ing-2', name: 'Sulphonic Acid (LABSA 96%)', unit: 'kg', amount: 16, qtyFormula: '16', unitPrice: 2.15 },
        { id: 'ing-3', name: 'Caustic Soda Pearls', unit: 'kg', amount: 3.5, qtyFormula: '3.5', unitPrice: 1.5 },
        { id: 'ing-4', name: 'Cocoamidopropyl Betaine (CAPB)', unit: 'kg', amount: 6, qtyFormula: '6', unitPrice: 2.8 },
        { id: 'ing-5', name: 'Industrial Perfume (Lemon / Pine / Fresh)', unit: 'L', amount: 1.2, qtyFormula: '1.2', unitPrice: 14.0 },
        { id: 'ing-6', name: 'Industrial Dye', unit: 'kg', amount: 0.2, qtyFormula: '0.2', unitPrice: 18.0 },
      ],
    },
    {
      id: 'formula-toilet-cleaner',
      name: 'Toilet Cleaner',
      production: 150,
      unit: 'L',
      createdAt: '2026-10-16T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-201', name: 'Hydrochloric Acid 32%', unit: 'L', amount: 38, qtyFormula: '38', unitPrice: 1.1 },
        { id: 'ing-202', name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', unit: 'kg', amount: 8, qtyFormula: '8', unitPrice: 2.4 },
        { id: 'ing-203', name: 'Industrial Perfume (Lemon / Pine / Fresh)', unit: 'L', amount: 1.0, qtyFormula: '1.0', unitPrice: 14.0 },
        { id: 'ing-204', name: 'Industrial Dye', unit: 'kg', amount: 0.15, qtyFormula: '0.15', unitPrice: 18.0 },
      ],
    },
    {
      id: 'formula-fabric-softener',
      name: 'Fabric Softener',
      production: 200,
      unit: 'L',
      createdAt: '2026-10-18T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-301', name: 'Cationic Softener Flakes', unit: 'kg', amount: 22, qtyFormula: '22', unitPrice: 3.2 },
        { id: 'ing-302', name: 'Industrial Perfume (Lemon / Pine / Fresh)', unit: 'L', amount: 1.5, qtyFormula: '1.5', unitPrice: 14.0 },
        { id: 'ing-303', name: 'Industrial Dye', unit: 'kg', amount: 0.15, qtyFormula: '0.15', unitPrice: 18.0 },
      ],
    },
  ],
  pricing: [
    { id: 'price-1', name: 'Dishwasher', unit: 'L', quantity: 1, price: 1.85 },
    { id: 'price-2', name: 'Toilet Cleaner', unit: 'L', quantity: 1, price: 2.1 },
    { id: 'price-3', name: 'Fabric Softener', unit: 'L', quantity: 1, price: 1.95 },
  ],
  stockMovements: [
    {
      id: 'mov-1',
      type: 'purchase',
      at: '2026-11-02T09:15:00.000Z',
      material: 'SLES 70% (Sodium Lauryl Ether Sulfate)',
      unit: 'kg',
      quantity: 200,
      remainingMaterial: 420,
      remainingStock: '420 kg SLES 70%, 310 kg Sulphonic Acid, 180 kg Caustic Soda',
    },
    {
      id: 'mov-2',
      type: 'production',
      at: '2026-11-07T08:30:00.000Z',
      product: 'Dishwasher',
      productQty: 600,
      productUnit: 'L',
      cost: 373.95,
      used: [
        { name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', amount: 72, unit: 'kg' },
        { name: 'Sulphonic Acid (LABSA 96%)', amount: 48, unit: 'kg' },
        { name: 'Caustic Soda Pearls', amount: 10.5, unit: 'kg' },
        { name: 'Cocoamidopropyl Betaine (CAPB)', amount: 18, unit: 'kg' },
      ],
      remainingStock: 'SLES 70% 420 kg left | Sulphonic Acid 310 kg left | Caustic Soda 180 kg left',
    },
    {
      id: 'mov-3',
      type: 'production',
      at: '2026-11-05T14:20:00.000Z',
      product: 'Toilet Cleaner',
      productQty: 450,
      productUnit: 'L',
      cost: 233.1,
      used: [
        { name: 'Hydrochloric Acid 32%', amount: 114, unit: 'L' },
        { name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', amount: 24, unit: 'kg' },
      ],
      remainingStock: 'Hydrochloric Acid 32% 260 L left | SLES 70% 420 kg left',
    },
    {
      id: 'mov-4',
      type: 'production',
      at: '2026-10-28T10:10:00.000Z',
      product: 'Fabric Softener',
      productQty: 400,
      productUnit: 'L',
      cost: 188.2,
      used: [
        { name: 'Cationic Softener Flakes', amount: 44, unit: 'kg' },
        { name: 'Industrial Perfume (Lemon / Pine / Fresh)', amount: 3, unit: 'L' },
      ],
      remainingStock: 'Cationic Softener Flakes 195 kg left | Perfume 45 L left',
    },
  ],
  productions: [
    { id: 'prod-1', date: '2026-11-07', product: 'Dishwasher', unit: 'L', quantity: 600, cost: 373.95 },
    { id: 'prod-2', date: '2026-11-05', product: 'Toilet Cleaner', unit: 'L', quantity: 450, cost: 233.1 },
    { id: 'prod-3', date: '2026-10-28', product: 'Fabric Softener', unit: 'L', quantity: 400, cost: 188.2 },
  ],
  salesRows: [
    { id: 'sale-1', date: '2026-11-07', item: 'Dishwasher', teamLeader: 'F. Moyo', customer: 'OK Zimbabwe Wholesale', saleType: 'cash', unitPrice: 1.85, quantity: 420, paidSoFar: 777 },
    { id: 'sale-2', date: '2026-11-05', item: 'Toilet Cleaner', teamLeader: 'T. Ncube', customer: 'Gain Cash & Carry', saleType: 'cash', unitPrice: 2.1, quantity: 310, paidSoFar: 651 },
    { id: 'sale-3', date: '2026-10-28', item: 'Fabric Softener', teamLeader: 'F. Moyo', customer: 'N. Richards Group', saleType: 'credit', unitPrice: 1.95, quantity: 260, paidSoFar: 320 },
  ],
  expenses: [
    { id: 'exp-1', date: '2026-11-07', wages: 145, rent: 0, fuel: 45, transport: 30, lunch: 22, other: 18 },
    { id: 'exp-2', date: '2026-11-05', wages: 145, rent: 0, fuel: 38, transport: 25, lunch: 22, other: 12 },
    { id: 'exp-3', date: '2026-10-28', wages: 145, rent: 80, fuel: 42, transport: 28, lunch: 22, other: 15 },
  ],
  projects: [],
}

/**
 * Builds tenant metadata:
 * - For `rodcroft` and `prixburg` (the seeded flagship tenants), returns their live tenant data.
 * - For any newly purchased Construction or Manufacturing website (or when `emptyData: true`),
 *   creates an exact Rodcroft or Prixburg tenant website with EMPTY data so the new subdomain
 *   starts completely clean as a tenant of Fortress.
 */
export const buildDefaultTemplateMetadata = ({
  slug = 'company',
  name = 'Company',
  ceo = '',
  location = 'Zimbabwe',
  about = '',
  systemType = 'construction',
  hue = '#1f4d45',
  emptyData = false,
}) => {
  const normalizedSlug = cleanSlug(slug || name)

  if (!emptyData && normalizedSlug === 'rodcroft') {
    return JSON.parse(
      JSON.stringify({
        ...DEFAULT_RODCROFT_METADATA,
        companyName: name || DEFAULT_RODCROFT_METADATA.companyName,
        brandName: name || DEFAULT_RODCROFT_METADATA.brandName,
        ceo: ceo || DEFAULT_RODCROFT_METADATA.ceo,
        location: location || DEFAULT_RODCROFT_METADATA.location,
        about: about || DEFAULT_RODCROFT_METADATA.about,
      }),
    )
  }

  if (!emptyData && normalizedSlug === 'prixburg') {
    return JSON.parse(
      JSON.stringify({
        ...DEFAULT_PRIXBURG_METADATA,
        companyName: name || DEFAULT_PRIXBURG_METADATA.companyName,
        brandName: name || DEFAULT_PRIXBURG_METADATA.brandName,
        ceo: ceo || DEFAULT_PRIXBURG_METADATA.ceo,
        location: location || DEFAULT_PRIXBURG_METADATA.location,
        about: about || DEFAULT_PRIXBURG_METADATA.about,
      }),
    )
  }

  const isManufacturing = systemType === 'manufacturing'
  if (isManufacturing) {
    return {
      slug: normalizedSlug,
      subdomain: subdomainLabelFor(normalizedSlug),
      template: 'prixburg',
      systemType: 'manufacturing',
      isSeededTenant: false,
      companyName: name,
      brandName: name,
      ceo: ceo || '',
      location: location || 'Zimbabwe',
      about:
        about ||
        `${name} manufacturing system hosted as a tenant on Fortress (${subdomainLabelFor(normalizedSlug)}).`,
      hue: hue || '#1f4d45',
      credentials: {
        mainUsername: normalizedSlug.toUpperCase().slice(0, 12) || 'ADMIN',
        mainPassword: `${name.replace(/\s+/g, '')}2026`,
        settingsUsername: `${name.toUpperCase()} CEO`,
        settingsPassword: `${name.replace(/\s+/g, '')}@CEO`,
      },
      rawMaterials: [],
      detergentFormulas: [],
      pricing: [],
      stockMovements: [],
      productions: [],
      salesRows: [],
      expenses: [],
      projects: [],
    }
  }

  return {
    slug: normalizedSlug,
    subdomain: subdomainLabelFor(normalizedSlug),
    template: 'rodcroft',
    systemType: 'construction',
    isSeededTenant: false,
    companyName: name,
    brandName: name,
    ceo: ceo || '',
    location: location || 'Zimbabwe',
    about:
      about ||
      `${name} construction reporting and project dashboards hosted as a tenant on Fortress (${subdomainLabelFor(normalizedSlug)}).`,
    hue: hue || '#9a3412',
    credentials: {
      engineeringUsername: 'Engineer',
      engineeringPassword: `${name.replace(/\s+/g, '')}engineer`,
      masterUsername: name.replace(/\s+/g, '') || 'Admin',
      masterPassword: `${name.replace(/\s+/g, '')}@2026`,
    },
    projects: [],
  }
}

export const loadAllCeoMetadata = () => {
  const defaults = {
    rodcroft: buildDefaultTemplateMetadata({
      slug: 'rodcroft',
      name: 'Rodcroft',
      systemType: 'construction',
      emptyData: false,
    }),
    prixburg: buildDefaultTemplateMetadata({
      slug: 'prixburg',
      name: 'Prixburg',
      systemType: 'manufacturing',
      emptyData: false,
    }),
  }
  if (typeof window === 'undefined') return defaults
  try {
    const raw = storage.getItem(CEO_METADATA_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    const merged = { ...defaults }
    Object.entries(parsed).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        merged[key] = {
          ...(defaults[key] || {}),
          ...value,
          subdomain: subdomainLabelFor(key),
        }
      }
    })
    if (merged.rodcroft) merged.rodcroft = pinRodcroftChadcombe(merged.rodcroft, defaults.rodcroft)
    return merged
  } catch {
    return defaults
  }
}

export const saveAllCeoMetadata = (map, { skipRemoteSync = false } = {}) => {
  if (typeof window === 'undefined') return
  try {
    storage.setItem(CEO_METADATA_STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new Event('fortress-ceo-metadata-change'))
  } catch {
    /* ignore quota */
  }
  if (!skipRemoteSync) {
    import('./accountsSync')
      .then(({ syncAccountsAndTenantsToServer }) => syncAccountsAndTenantsToServer([], map))
      .catch(() => {})
  }
}

function pinRodcroftChadcombe(saved, base) {
  const chadcombe = (base?.projects || []).find((project) => project?.id === RODCROFT_CHADCOMBE_PROJECT_ID) ||
    (base?.projects || [])[0]
  const savedProjects = Array.isArray(saved?.projects) ? saved.projects : []
  const extras = savedProjects.filter((project) => {
    const name = String(project?.name || '').trim().toLowerCase()
    if (!project?.id || name === 'lemon') return false
    if (project.id === RODCROFT_CHADCOMBE_PROJECT_ID) return false
    return true
  })
  return {
    ...(base || {}),
    ...(saved || {}),
    slug: 'rodcroft',
    companyName: 'Rodcroft',
    brandName: 'Rodcroft',
    template: 'rodcroft',
    systemType: 'construction',
    subdomain: 'rodcroft.fortress.vercel.app',
    projects: [
      {
        ...(chadcombe || {}),
        id: RODCROFT_CHADCOMBE_PROJECT_ID,
        name: 'Chadcombe',
      },
      ...extras,
    ],
  }
}

export const getSiteCeoMetadata = (siteOrSlug) => {
  const all = loadAllCeoMetadata()
  const rawSlug =
    typeof siteOrSlug === 'string'
      ? siteOrSlug
      : siteOrSlug?.slug || siteOrSlug?.catalogId || siteOrSlug?.name || 'rodcroft'
  const slug = cleanSlug(String(rawSlug).replace(/^site-/, ''))
  if (slug === 'rodcroft') return pinRodcroftChadcombe(all.rodcroft, all.rodcroft)
  if (all[slug]) return all[slug]

  const isSeeded = slug === 'rodcroft' || slug === 'prixburg'
  return buildDefaultTemplateMetadata({
    slug,
    name: typeof siteOrSlug === 'object' ? siteOrSlug?.name || slug : slug,
    ceo: typeof siteOrSlug === 'object' ? siteOrSlug?.ceo || '' : '',
    systemType:
      typeof siteOrSlug === 'object'
        ? siteOrSlug?.systemType || (slug === 'prixburg' ? 'manufacturing' : 'construction')
        : slug === 'prixburg'
          ? 'manufacturing'
          : 'construction',
    emptyData: !isSeeded,
  })
}

export const saveSiteCeoMetadata = (slugOrSite, metadata) => {
  const rawSlug =
    typeof slugOrSite === 'string'
      ? slugOrSite
      : slugOrSite?.slug || slugOrSite?.catalogId || metadata?.slug || metadata?.companyName || 'company'
  const slug = cleanSlug(String(rawSlug).replace(/^site-/, ''))
  const all = loadAllCeoMetadata()
  const next = {
    ...(all[slug] || {}),
    ...metadata,
    slug,
    subdomain: subdomainLabelFor(slug),
  }
  all[slug] = next
  saveAllCeoMetadata(all)
  return next
}

/**
 * Computes Prixburg CEO Analysis period tables (Today, This week, This month, This year)
 * for both CEO Net Profit and CEO Gross Profit.
 */
export const computePrixburgCeoAnalysis = (metaOrSite) => {
  const meta =
    metaOrSite && metaOrSite.rawMaterials !== undefined
      ? metaOrSite
      : getSiteCeoMetadata(metaOrSite)

  const pricing = meta?.pricing || []
  const productions = meta?.productions || []
  const salesRows = meta?.salesRows || []
  const expenses = meta?.expenses || []

  const sellingPriceFor = (name) => {
    const hit = pricing.find(
      (p) => String(p.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase(),
    )
    if (!hit) return 0
    const qty = Number(hit.quantity) || 1
    return qty > 0 ? (Number(hit.price) || 0) / qty : 0
  }

  // Reference dates based on latest activity or today
  const allDates = [
    ...productions.map((p) => p.date),
    ...salesRows.map((s) => s.date),
    ...expenses.map((e) => e.date),
  ]
    .filter(Boolean)
    .sort()
  const todayDate = allDates.at(-1) || new Date().toISOString().slice(0, 10)
  const currentMonth = todayDate.slice(0, 7)
  const currentYear = todayDate.slice(0, 4)

  // Week window: 7 days ending on todayDate
  const todayMs = new Date(`${todayDate}T00:00:00`).getTime()
  const inPeriod = (dateStr, periodKey) => {
    if (!dateStr) return false
    if (periodKey === 'daily') return dateStr === todayDate
    if (periodKey === 'weekly') {
      const ms = new Date(`${dateStr}T00:00:00`).getTime()
      const diffDays = (todayMs - ms) / 86400000
      return diffDays >= 0 && diffDays <= 7
    }
    if (periodKey === 'monthly') return dateStr.slice(0, 7) === currentMonth
    if (periodKey === 'yearly') return dateStr.slice(0, 4) === currentYear
    return false
  }

  const periods = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'This week' },
    { key: 'monthly', label: 'This month' },
    { key: 'yearly', label: 'This year' },
  ]

  const netProfitRows = periods.map(({ key, label }) => {
    const pSales = salesRows
      .filter((s) => inPeriod(s.date, key))
      .reduce((sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0), 0)
    const pRawCost = productions
      .filter((p) => inPeriod(p.date, key))
      .reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
    const pOpExpenses = expenses
      .filter((e) => inPeriod(e.date, key))
      .reduce(
        (sum, e) =>
          sum +
          (Number(e.wages) || 0) +
          (Number(e.rent) || 0) +
          (Number(e.fuel) || 0) +
          (Number(e.transport) || 0) +
          (Number(e.lunch) || 0) +
          (Number(e.other) || 0),
        0,
      )
    const totalExpenses = pRawCost + pOpExpenses
    return {
      key,
      label,
      sales: Math.round(pSales * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      profit: Math.round((pSales - totalExpenses) * 100) / 100,
    }
  })

  const grossProfitRows = periods.map(({ key, label }) => {
    let expectedSales = 0
    let cost = 0
    productions
      .filter((p) => inPeriod(p.date, key))
      .forEach((p) => {
        const qty = Number(p.quantity) || 0
        const unitSell = sellingPriceFor(p.product)
        expectedSales += qty * unitSell
        cost += Number(p.cost) || 0
      })
    return {
      key,
      label,
      expectedSales: Math.round(expectedSales * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      gross: Math.round((expectedSales - cost) * 100) / 100,
    }
  })

  const creditRows = salesRows.filter((s) => s.saleType === 'credit')
  const creditTotal = creditRows.reduce(
    (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0),
    0,
  )
  const creditPaid = creditRows.reduce((sum, s) => sum + (Number(s.paidSoFar) || 0), 0)
  const outstandingCredit = Math.max(0, Math.round((creditTotal - creditPaid) * 100) / 100)

  return {
    netProfitRows,
    grossProfitRows,
    outstandingCredit,
    hasData: productions.length > 0 || salesRows.length > 0 || expenses.length > 0,
  }
}

export function overviewForConstructionProject(project, meta = {}) {
  const valuations = project.valuations || []
  const totalWorkValued = valuations.reduce((sum, v) => sum + (Number(v.valueEarned) || 0), 0)
  const totalProduction = valuations.reduce((sum, v) => sum + (Number(v.production) || 0), 0)
  const matAnalysis = project.materialAnalysis || []
  const workers = project.workers || []
  const adminCount = workers.filter((w) => w.register === 'admin').length
  const operatorCount = workers.filter((w) => w.register === 'operators').length
  const inductionCount = workers.filter((w) => w.register === 'induction').length
  const fuelEntries = project.fuel?.entries || []
  const fuelConsumedLiters = fuelEntries.reduce((sum, e) => sum + (Number(e.quantity || e.liters) || 0), 0)
  const fuelConsumedCost = fuelEntries.reduce((sum, e) => sum + (Number(e.totalCost) || 0), 0)

  return {
        id: project.id,
        name: project.name,
        code: project.code || 'SITE',
        template: 'rodcroft',
        systemType: 'construction',
        companyName: meta.companyName,
        slug: meta.slug,
        subdomain: meta.subdomain,
        location: project.location || meta.location,
        manager: project.manager || meta.ceo || 'Engineer',
        status: project.status || 'active',
        startDate: project.startDate || '2026-09-13',
        summary: project.summary || '',
        valuations,
        materialAnalysis: matAnalysis,
        workers,
        fuel: project.fuel || { bulkInsertedLiters: 0, bulkInsertedCost: 0, entries: [] },
        metrics: {
          totalWorkValued: Math.round(totalWorkValued * 100) / 100,
          totalProduction: Math.round(totalProduction * 100) / 100,
          overallRate: totalProduction > 0 ? totalWorkValued / totalProduction : 0,
          activitiesCount: valuations.length,
          workersOnSite: workers.length,
          adminCount,
          operatorCount,
          inductionCount,
          materialLines: matAnalysis.length,
          fuelConsumedLiters: Math.round(fuelConsumedLiters * 100) / 100,
          fuelConsumedCost: Math.round(fuelConsumedCost * 100) / 100,
          bulkFuelLiters: Number(project.fuel?.bulkInsertedLiters) || 0,
          bulkFuelCost: Number(project.fuel?.bulkInsertedCost) || 0,
    },
  }
}

export const computeSiteProjectsOverview = (siteOrSlug) => {
  const meta = getSiteCeoMetadata(siteOrSlug)
  const isManufacturing = meta.systemType === 'manufacturing' || meta.template === 'prixburg'

  if (!isManufacturing) {
    const projects = Array.isArray(meta.projects) ? meta.projects : []
    return projects.map((project) => overviewForConstructionProject(project, meta))
  }

  const analysis = computePrixburgCeoAnalysis(meta)
  return [
    {
      id: `${meta.slug}-ceo-analysis`,
      name: `${meta.companyName || 'Prixburg'} Factory`,
      template: 'prixburg',
      systemType: 'manufacturing',
      companyName: meta.companyName,
      slug: meta.slug,
      subdomain: meta.subdomain,
      analysis,
    },
  ]
}
