import { storage } from './storage'

export const FORTRESS_SUBDOMAIN_ROOT = 'fortress.vercel.app'
export const CEO_METADATA_STORAGE_KEY = 'fortress-ceo-metadata-v2'

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
  const slug = cleanSlug(String(rawSlug).replace(/^site-/, ''))
  return `${slug}.${FORTRESS_SUBDOMAIN_ROOT}`
}

export const subdomainUrlFor = (slugOrSite) => `https://${subdomainLabelFor(slugOrSite)}`

/**
 * Detects if the current browser request is on a generated company subdomain
 * such as `rodcroft.fortress.vercel.app`, `prixburg.fortress.vercel.app`,
 * `<slug>.fortress.vercel.app`, `<slug>.localhost`, or `?subdomain=<slug>`.
 */
export const detectActiveSubdomain = () => {
  if (typeof window === 'undefined') return ''

  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('subdomain') || params.get('site')
    if (fromQuery) return cleanSlug(fromQuery)
  } catch {
    /* ignore */
  }

  const host = String(window.location.hostname || '')
    .toLowerCase()
    .trim()

  if (!host || host === 'localhost' || host === '127.0.0.1') return ''

  // Legacy aliases map cleanly to their template slugs
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

  // Match <slug>.localhost for local subdomain testing
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length)
    if (sub && sub !== 'www' && !sub.includes('.')) {
      return cleanSlug(sub)
    }
  }

  return ''
}

export const DEFAULT_RODCROFT_METADATA = {
  slug: 'rodcroft',
  subdomain: 'rodcroft.fortress.vercel.app',
  template: 'rodcroft',
  systemType: 'construction',
  companyName: 'Rodcroft',
  brandName: 'Rodcroft',
  ceo: 'Mbizvo Rodcroft',
  location: 'Harare, Zimbabwe',
  about:
    'Rodcroft Construction runs earned-value valuations, QS material and fuel schedules, plant registers, and SHEQ site inspections across live construction sites.',
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
      name: 'Chadcombe Road & Storm Drainage Upgrade',
      code: 'RC-CHD-01',
      location: 'Chadcombe, Harare',
      client: 'City Infrastructure & Roads Department',
      manager: 'Eng. Mbizvo',
      status: 'active',
      startDate: '2026-08-28',
      endDate: null,
      summary:
        'Road formation, watering, grading, compaction, storm water concrete culvert installation, and asphalt surfacing.',
      boqItems: [
        {
          id: 'boq-1',
          description: 'Site establishment, setting out & clearing',
          unit: 'sum',
          quantity: 1,
          rate: 28500,
          targetCost: 28500,
          actualMeasuredWork: 28500,
          actualCostIncurred: 27200,
        },
        {
          id: 'boq-2',
          description: 'Road watering, grading and compaction (sub-base & base)',
          unit: 'm2',
          quantity: 14500,
          rate: 8.5,
          targetCost: 123250,
          actualMeasuredWork: 98600,
          actualCostIncurred: 91400,
        },
        {
          id: 'boq-3',
          description: 'Precast concrete storm drainage culverts (900mm dia)',
          unit: 'm',
          quantity: 420,
          rate: 195,
          targetCost: 81900,
          actualMeasuredWork: 62400,
          actualCostIncurred: 60150,
        },
        {
          id: 'boq-4',
          description: 'Reinforced concrete headwalls & wingwalls (Class 25)',
          unit: 'm3',
          quantity: 185,
          rate: 260,
          targetCost: 48100,
          actualMeasuredWork: 36400,
          actualCostIncurred: 35800,
        },
      ],
      materials: [
        {
          id: 'mat-1',
          date: '2026-11-01',
          name: 'PC 42.5 Cement (50kg bags)',
          unit: 'bags',
          requested: 1200,
          received: 1050,
          used: 790,
          unitCost: 11.5,
        },
        {
          id: 'mat-2',
          date: '2026-11-02',
          name: '19mm Crushed Granite Stone',
          unit: 'm3',
          requested: 320,
          received: 280,
          used: 215,
          unitCost: 34,
        },
        {
          id: 'mat-3',
          date: '2026-11-03',
          name: 'River Sand (Washed)',
          unit: 'm3',
          requested: 260,
          received: 240,
          used: 180,
          unitCost: 22,
        },
        {
          id: 'mat-4',
          date: '2026-11-04',
          name: 'High Yield Deformed Bar Y16',
          unit: 'tons',
          requested: 18,
          received: 16,
          used: 12.4,
          unitCost: 980,
        },
      ],
      fuel: {
        bulkTankCapacityLiters: 10000,
        bulkInsertedLiters: 7500,
        ratePerLiter: 1.62,
        entries: [
          {
            id: 'fuel-1',
            date: '2026-11-03',
            plant: 'CAT 140K Motor Grader (GR-01)',
            operator: 'T. Moyo',
            liters: 185,
            rate: 1.62,
          },
          {
            id: 'fuel-2',
            date: '2026-11-04',
            plant: 'Bomag Vibratory Roller (RL-02)',
            operator: 'S. Dube',
            liters: 110,
            rate: 1.62,
          },
          {
            id: 'fuel-3',
            date: '2026-11-05',
            plant: 'Water Bowser 16,000L (WB-01)',
            operator: 'P. Ncube',
            liters: 140,
            rate: 1.62,
          },
          {
            id: 'fuel-4',
            date: '2026-11-06',
            plant: 'JCB 3CX Backhoe Loader (TLB-01)',
            operator: 'K. Sibanda',
            liters: 95,
            rate: 1.62,
          },
        ],
      },
      workers: [
        { id: 'w-1', name: 'Eng. Farai Mbizvo', role: 'Site Agent / Engineer', register: 'admin', presentDays: 24 },
        { id: 'w-2', name: 'Rudo Chikwanda', role: 'Quantity Surveyor', register: 'admin', presentDays: 24 },
        { id: 'w-3', name: 'Blessing Ndlovu', role: 'SHEQ Officer', register: 'admin', presentDays: 23 },
        { id: 'w-4', name: 'Tawanda Moyo', role: 'Grader Operator', register: 'operators', plant: 'CAT 140K Grader', presentDays: 22 },
        { id: 'w-5', name: 'Simba Dube', role: 'Roller Operator', register: 'operators', plant: 'Bomag Roller', presentDays: 22 },
        { id: 'w-6', name: 'Peter Ncube', role: 'Bowser Driver', register: 'operators', plant: '16,000L Water Bowser', presentDays: 21 },
        { id: 'w-7', name: 'Kudzai Sibanda', role: 'TLB Operator', register: 'operators', plant: 'JCB 3CX', presentDays: 23 },
        { id: 'w-8', name: 'Tendai Mutasa', role: 'Leading Hand Concrete', register: 'induction', presentDays: 24 },
        { id: 'w-9', name: 'Tinashe Gumbo', role: 'Steel Fixer', register: 'induction', presentDays: 22 },
        { id: 'w-10', name: 'Munashe Zvobgo', role: 'Carpenter / Formwork', register: 'induction', presentDays: 22 },
        { id: 'w-11', name: 'Chipo Mhlanga', role: 'Storekeeper', register: 'admin', presentDays: 24 },
        { id: 'w-12', name: 'Lovemore Phiri', role: 'General Hand', register: 'induction', presentDays: 20 },
      ],
      ppe: [
        { id: 'ppe-1', item: 'Safety Hard Hats', received: 40, issued: 32, unitCost: 8.5 },
        { id: 'ppe-2', item: 'Steel-Toe Safety Boots (Pairs)', received: 36, issued: 30, unitCost: 35 },
        { id: 'ppe-3', item: 'High-Vis Reflective Vests', received: 50, issued: 38, unitCost: 6 },
        { id: 'ppe-4', item: 'Heavy Duty Leather Gloves', received: 60, issued: 44, unitCost: 4.5 },
      ],
      sheqReports: [
        {
          id: 'sheq-1',
          date: '2026-11-05',
          type: 'Weekly SHEQ Inspection',
          status: 'Compliant',
          highlight: 'Zero LTI recorded. Trench barricading and plant reverse alarms verified on chainage 0+400 to 1+200.',
          incidents: 0,
        },
        {
          id: 'sheq-2',
          date: '2026-11-01',
          type: 'Site Induction & Toolbox Talk',
          status: 'Completed',
          highlight: '12 crew members inducted on working near heavy grading & compaction equipment.',
          incidents: 0,
        },
      ],
    },
    {
      id: 'p-1789313935791',
      name: 'Borrowdale Commercial Office Park Foundations & Frame',
      code: 'RC-BDL-02',
      location: 'Borrowdale, Harare',
      client: 'Sam Levy Commercial Developments',
      manager: 'Eng. R. Chikwanda',
      status: 'active',
      startDate: '2026-09-15',
      endDate: null,
      summary:
        'Pad foundations, lift shaft core walls, ground-to-third floor RC columns, and structural steel roof trusses.',
      boqItems: [
        {
          id: 'boq-201',
          description: 'Bulk earthworks & pad foundation excavations',
          unit: 'm3',
          quantity: 2800,
          rate: 16,
          targetCost: 44800,
          actualMeasuredWork: 44800,
          actualCostIncurred: 41900,
        },
        {
          id: 'boq-202',
          description: 'Reinforced concrete C30 in bases, columns & suspended slabs',
          unit: 'm3',
          quantity: 640,
          rate: 245,
          targetCost: 156800,
          actualMeasuredWork: 117600,
          actualCostIncurred: 110400,
        },
        {
          id: 'boq-203',
          description: 'High tensile reinforcement steel Y12–Y25 cut, bent & fixed',
          unit: 'tons',
          quantity: 52,
          rate: 1180,
          targetCost: 61360,
          actualMeasuredWork: 46020,
          actualCostIncurred: 44200,
        },
      ],
      materials: [
        {
          id: 'mat-201',
          date: '2026-11-02',
          name: 'PC 42.5 Cement (50kg bags)',
          unit: 'bags',
          requested: 1800,
          received: 1600,
          used: 1280,
          unitCost: 11.5,
        },
        {
          id: 'mat-202',
          date: '2026-11-04',
          name: 'Phenolic Marine Formwork Shutters (18mm)',
          unit: 'sheets',
          requested: 160,
          received: 160,
          used: 135,
          unitCost: 48,
        },
        {
          id: 'mat-203',
          date: '2026-11-05',
          name: 'Rebar Y20 Deformed Bars',
          unit: 'tons',
          requested: 32,
          received: 28,
          used: 21.5,
          unitCost: 980,
        },
      ],
      fuel: {
        bulkTankCapacityLiters: 5000,
        bulkInsertedLiters: 4200,
        ratePerLiter: 1.62,
        entries: [
          {
            id: 'fuel-201',
            date: '2026-11-04',
            plant: 'Liebherr Tower Crane Generator (GEN-01)',
            operator: 'M. Kaseke',
            liters: 160,
            rate: 1.62,
          },
          {
            id: 'fuel-202',
            date: '2026-11-05',
            plant: 'Winget Concrete Mixer & Dumper Fleet',
            operator: 'B. Banda',
            liters: 125,
            rate: 1.62,
          },
        ],
      },
      workers: [
        { id: 'w-201', name: 'Eng. Rudo Chikwanda', role: 'Project Lead', register: 'admin', presentDays: 24 },
        { id: 'w-202', name: 'Munyaradzi Kaseke', role: 'Crane Operator', register: 'operators', plant: 'Tower Crane', presentDays: 23 },
        { id: 'w-203', name: 'Brighton Banda', role: 'Mixer Operator', register: 'operators', plant: 'Concrete Mixer', presentDays: 22 },
        { id: 'w-204', name: 'Givemore Chuma', role: 'Foreman Shuttering', register: 'induction', presentDays: 24 },
        { id: 'w-205', name: 'Nyarai Moyo', role: 'Safety Officer', register: 'admin', presentDays: 24 },
        { id: 'w-206', name: 'Tafadzwa Shoko', role: 'Steel Fixer Lead', register: 'induction', presentDays: 23 },
      ],
      ppe: [
        { id: 'ppe-201', item: 'Full Body Safety Harnesses', received: 18, issued: 15, unitCost: 65 },
        { id: 'ppe-202', item: 'Safety Hard Hats', received: 30, issued: 26, unitCost: 8.5 },
      ],
      sheqReports: [
        {
          id: 'sheq-201',
          date: '2026-11-06',
          type: 'Working at Height & Scaffolding Inspection',
          status: 'Compliant',
          highlight: 'Second floor slab edge protection and harness anchor points certified safe.',
          incidents: 0,
        },
      ],
    },
  ],
}

export const DEFAULT_PRIXBURG_METADATA = {
  slug: 'prixburg',
  subdomain: 'prixburg.fortress.vercel.app',
  template: 'prixburg',
  systemType: 'manufacturing',
  companyName: 'Prixburg',
  brandName: 'Prixburg',
  ceo: 'Tawanda Chitukutuku',
  location: 'Harare, Zimbabwe',
  about:
    'Prixburg is a chemical manufacturing factory. Fortress tracks storeroom materials, consumed stock, detergent formulas, production batches, and sales of dishwasher, toilet cleaner, and fabric softener.',
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
    { id: 'rm-7', date: '2026-11-04', name: 'Lemon & Pine Industrial Perfume', unit: 'L', quantity: 45, qtyFormula: '45', unitCost: 14.0 },
    { id: 'rm-8', date: '2026-11-04', name: 'Industrial Dye (Emerald / Marine Blue)', unit: 'kg', quantity: 22, qtyFormula: '22', unitCost: 18.0 },
  ],
  detergentFormulas: [
    {
      id: 'formula-dishwasher',
      name: 'Ultra Lemon Dishwashing Liquid',
      production: 200,
      unit: 'L',
      createdAt: '2026-10-15T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-1', name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', unit: 'kg', amount: 24, qtyFormula: '24', unitPrice: 2.4 },
        { id: 'ing-2', name: 'Sulphonic Acid (LABSA 96%)', unit: 'kg', amount: 16, qtyFormula: '16', unitPrice: 2.15 },
        { id: 'ing-3', name: 'Caustic Soda Pearls', unit: 'kg', amount: 3.5, qtyFormula: '3.5', unitPrice: 1.5 },
        { id: 'ing-4', name: 'Cocoamidopropyl Betaine (CAPB)', unit: 'kg', amount: 6, qtyFormula: '6', unitPrice: 2.8 },
        { id: 'ing-5', name: 'Lemon & Pine Industrial Perfume', unit: 'L', amount: 1.2, qtyFormula: '1.2', unitPrice: 14.0 },
        { id: 'ing-6', name: 'Industrial Dye (Emerald / Marine Blue)', unit: 'kg', amount: 0.2, qtyFormula: '0.2', unitPrice: 18.0 },
      ],
    },
    {
      id: 'formula-toilet-cleaner',
      name: 'Heavy Duty Pine Toilet Cleaner',
      production: 150,
      unit: 'L',
      createdAt: '2026-10-16T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-201', name: 'Hydrochloric Acid 32%', unit: 'L', amount: 38, qtyFormula: '38', unitPrice: 1.1 },
        { id: 'ing-202', name: 'SLES 70% (Sodium Lauryl Ether Sulfate)', unit: 'kg', amount: 8, qtyFormula: '8', unitPrice: 2.4 },
        { id: 'ing-203', name: 'Lemon & Pine Industrial Perfume', unit: 'L', amount: 1.0, qtyFormula: '1.0', unitPrice: 14.0 },
        { id: 'ing-204', name: 'Industrial Dye (Emerald / Marine Blue)', unit: 'kg', amount: 0.15, qtyFormula: '0.15', unitPrice: 18.0 },
      ],
    },
    {
      id: 'formula-fabric-softener',
      name: 'Fresh Breeze Fabric Softener',
      production: 200,
      unit: 'L',
      createdAt: '2026-10-18T08:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      ingredients: [
        { id: 'ing-301', name: 'Cationic Softener Flakes', unit: 'kg', amount: 22, qtyFormula: '22', unitPrice: 3.2 },
        { id: 'ing-302', name: 'Lemon & Pine Industrial Perfume', unit: 'L', amount: 1.5, qtyFormula: '1.5', unitPrice: 14.0 },
        { id: 'ing-303', name: 'Industrial Dye (Emerald / Marine Blue)', unit: 'kg', amount: 0.15, qtyFormula: '0.15', unitPrice: 18.0 },
      ],
    },
  ],
  pricing: [
    { id: 'price-1', name: 'Ultra Lemon Dishwashing Liquid', unit: 'L', quantity: 1, price: 1.85 },
    { id: 'price-2', name: 'Heavy Duty Pine Toilet Cleaner', unit: 'L', quantity: 1, price: 2.1 },
    { id: 'price-3', name: 'Fresh Breeze Fabric Softener', unit: 'L', quantity: 1, price: 1.95 },
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
      at: '2026-11-04T11:30:00.000Z',
      product: 'Ultra Lemon Dishwashing Liquid',
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
      product: 'Heavy Duty Pine Toilet Cleaner',
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
      at: '2026-11-06T10:10:00.000Z',
      product: 'Fresh Breeze Fabric Softener',
      productQty: 400,
      productUnit: 'L',
      cost: 188.2,
      used: [
        { name: 'Cationic Softener Flakes', amount: 44, unit: 'kg' },
        { name: 'Lemon & Pine Industrial Perfume', amount: 3, unit: 'L' },
      ],
      remainingStock: 'Cationic Softener Flakes 195 kg left | Perfume 45 L left',
    },
  ],
  productions: [
    { id: 'prod-1', date: '2026-11-04', product: 'Ultra Lemon Dishwashing Liquid', unit: 'L', quantity: 600, cost: 373.95, lineProject: 'Dishwashing & Kitchen Care Line' },
    { id: 'prod-2', date: '2026-11-05', product: 'Heavy Duty Pine Toilet Cleaner', unit: 'L', quantity: 450, cost: 233.1, lineProject: 'Sanitation & Pine Disinfectant Line' },
    { id: 'prod-3', date: '2026-11-06', product: 'Fresh Breeze Fabric Softener', unit: 'L', quantity: 400, cost: 188.2, lineProject: 'Laundry & Fabric Care Line' },
  ],
  salesRows: [
    { id: 'sale-1', date: '2026-11-04', item: 'Ultra Lemon Dishwashing Liquid', teamLeader: 'F. Moyo', customer: 'OK Zimbabwe Wholesale', saleType: 'cash', unitPrice: 1.85, quantity: 420 },
    { id: 'sale-2', date: '2026-11-05', item: 'Heavy Duty Pine Toilet Cleaner', teamLeader: 'T. Ncube', customer: 'Gain Cash & Carry', saleType: 'cash', unitPrice: 2.1, quantity: 310 },
    { id: 'sale-3', date: '2026-11-06', item: 'Fresh Breeze Fabric Softener', teamLeader: 'F. Moyo', customer: 'N. Richards Group', saleType: 'credit', unitPrice: 1.95, quantity: 260, paidSoFar: 320 },
  ],
  expenses: [
    { id: 'exp-1', date: '2026-11-04', wages: 145, rent: 80, fuel: 45, transport: 30, lunch: 22, other: 18 },
    { id: 'exp-2', date: '2026-11-05', wages: 145, rent: 0, fuel: 38, transport: 25, lunch: 22, other: 12 },
    { id: 'exp-3', date: '2026-11-06', wages: 145, rent: 0, fuel: 42, transport: 28, lunch: 22, other: 15 },
  ],
  projects: [
    {
      id: 'pb-proj-1',
      name: 'Dishwashing & Kitchen Care Production Line',
      code: 'PB-LINE-01',
      location: 'Workington Plant Bay A, Harare',
      manager: 'Tawanda Chitukutuku',
      status: 'active',
      startDate: '2026-10-01',
      productFocus: 'Ultra Lemon Dishwashing Liquid',
      formulaId: 'formula-dishwasher',
      summary: 'High-volume SLES & LABSA dishwashing liquid batch mixing, bottling, and wholesale dispatch.',
    },
    {
      id: 'pb-proj-2',
      name: 'Sanitation & Pine Toilet Cleaner Line',
      code: 'PB-LINE-02',
      location: 'Workington Plant Bay B, Harare',
      manager: 'Tawanda Chitukutuku',
      status: 'active',
      startDate: '2026-10-05',
      productFocus: 'Heavy Duty Pine Toilet Cleaner',
      formulaId: 'formula-toilet-cleaner',
      summary: 'Acid-resistant mixing line for heavy duty pine toilet cleaner and institutional disinfectants.',
    },
    {
      id: 'pb-proj-3',
      name: 'Laundry & Fabric Softener Line',
      code: 'PB-LINE-03',
      location: 'Workington Plant Bay C, Harare',
      manager: 'Tawanda Chitukutuku',
      status: 'active',
      startDate: '2026-10-12',
      productFocus: 'Fresh Breeze Fabric Softener',
      formulaId: 'formula-fabric-softener',
      summary: 'Warm-emulsion cationic fabric softener blending and 2L/5L retail packaging.',
    },
  ],
}

export const buildDefaultTemplateMetadata = ({
  slug = 'company',
  name = 'Company',
  ceo = '',
  location = 'Zimbabwe',
  about = '',
  systemType = 'construction',
  hue = '#1f4d45',
  initialProjects = [],
}) => {
  const normalizedSlug = cleanSlug(slug || name)
  if (normalizedSlug === 'rodcroft') {
    return JSON.parse(JSON.stringify({
      ...DEFAULT_RODCROFT_METADATA,
      companyName: name || DEFAULT_RODCROFT_METADATA.companyName,
      brandName: name || DEFAULT_RODCROFT_METADATA.brandName,
      ceo: ceo || DEFAULT_RODCROFT_METADATA.ceo,
      location: location || DEFAULT_RODCROFT_METADATA.location,
      about: about || DEFAULT_RODCROFT_METADATA.about,
    }))
  }
  if (normalizedSlug === 'prixburg') {
    return JSON.parse(JSON.stringify({
      ...DEFAULT_PRIXBURG_METADATA,
      companyName: name || DEFAULT_PRIXBURG_METADATA.companyName,
      brandName: name || DEFAULT_PRIXBURG_METADATA.brandName,
      ceo: ceo || DEFAULT_PRIXBURG_METADATA.ceo,
      location: location || DEFAULT_PRIXBURG_METADATA.location,
      about: about || DEFAULT_PRIXBURG_METADATA.about,
    }))
  }

  const isManufacturing = systemType === 'manufacturing'
  if (isManufacturing) {
    const base = JSON.parse(JSON.stringify(DEFAULT_PRIXBURG_METADATA))
    return {
      ...base,
      slug: normalizedSlug,
      subdomain: subdomainLabelFor(normalizedSlug),
      template: 'prixburg',
      systemType: 'manufacturing',
      companyName: name,
      brandName: name,
      ceo: ceo || 'CEO',
      location: location || 'Zimbabwe',
      about:
        about ||
        `${name} runs on the Prixburg manufacturing template with storeroom materials, formulas, batch production, and CEO profit analysis.`,
      hue: hue || '#1f4d45',
      credentials: {
        mainUsername: normalizedSlug.toUpperCase().slice(0, 12) || 'ADMIN',
        mainPassword: `${name.replace(/\s+/g, '')}2026`,
        settingsUsername: `${name.toUpperCase()} CEO`,
        settingsPassword: `${name.replace(/\s+/g, '')}@CEO`,
      },
      projects:
        initialProjects && initialProjects.length
          ? initialProjects
          : base.projects.map((p, idx) => ({
              ...p,
              id: `${normalizedSlug}-line-${idx + 1}`,
              manager: ceo || p.manager,
            })),
    }
  }

  const base = JSON.parse(JSON.stringify(DEFAULT_RODCROFT_METADATA))
  return {
    ...base,
    slug: normalizedSlug,
    subdomain: subdomainLabelFor(normalizedSlug),
    template: 'rodcroft',
    systemType: 'construction',
    companyName: name,
    brandName: name,
    ceo: ceo || 'CEO',
    location: location || 'Zimbabwe',
    about:
      about ||
      `${name} runs on the Rodcroft construction template with earned-value valuations, QS schedules, plant registers, and SHEQ dashboards.`,
    hue: hue || '#9a3412',
    credentials: {
      engineeringUsername: 'Engineer',
      engineeringPassword: `${name.replace(/\s+/g, '')}engineer`,
      masterUsername: name.replace(/\s+/g, '') || 'Admin',
      masterPassword: `${name.replace(/\s+/g, '')}@2026`,
    },
    projects:
      initialProjects && initialProjects.length
        ? initialProjects
        : base.projects.map((p, idx) => ({
            ...p,
            id: `p-${normalizedSlug}-${idx + 1}`,
            name: idx === 0 ? `${name} Main Civil & Structural Works` : `${name} Site Extension Project`,
            manager: ceo || p.manager,
          })),
  }
}

export const loadAllCeoMetadata = () => {
  const defaults = {
    rodcroft: buildDefaultTemplateMetadata({ slug: 'rodcroft', name: 'Rodcroft', systemType: 'construction' }),
    prixburg: buildDefaultTemplateMetadata({ slug: 'prixburg', name: 'Prixburg', systemType: 'manufacturing' }),
    siteworks: buildDefaultTemplateMetadata({
      slug: 'siteworks',
      name: 'Siteworks',
      ceo: 'Kudzi Ndlovu',
      systemType: 'construction',
    }),
    fieldnote: buildDefaultTemplateMetadata({
      slug: 'fieldnote',
      name: 'Fieldnote',
      ceo: 'Tatenda Chirwa',
      systemType: 'construction',
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
    return merged
  } catch {
    return defaults
  }
}

export const saveAllCeoMetadata = (map) => {
  if (typeof window === 'undefined') return
  try {
    storage.setItem(CEO_METADATA_STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new Event('fortress-ceo-metadata-change'))
  } catch {
    /* ignore quota */
  }
}

export const getSiteCeoMetadata = (siteOrSlug) => {
  const all = loadAllCeoMetadata()
  const slug = cleanSlug(
    typeof siteOrSlug === 'string'
      ? siteOrSlug
      : siteOrSlug?.slug || siteOrSlug?.catalogId || siteOrSlug?.name || 'rodcroft',
  )
  if (all[slug]) return all[slug]
  const built = buildDefaultTemplateMetadata({
    slug,
    name: typeof siteOrSlug === 'object' ? siteOrSlug?.name || slug : slug,
    ceo: typeof siteOrSlug === 'object' ? siteOrSlug?.ceo || '' : '',
    systemType: typeof siteOrSlug === 'object' ? siteOrSlug?.systemType || 'construction' : 'construction',
  })
  return built
}

export const saveSiteCeoMetadata = (slugOrSite, metadata) => {
  const slug = cleanSlug(
    typeof slugOrSite === 'string'
      ? slugOrSite
      : slugOrSite?.slug || slugOrSite?.catalogId || metadata?.slug || metadata?.companyName || 'company',
  )
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
 * Computes a unified project overview list for a site so that CEOs can inspect
 * every project right on the Fortress Landing Page Profile (next to the gallery grid)
 * as well as inside the generated app.
 */
export const computeSiteProjectsOverview = (siteOrSlug) => {
  const meta = getSiteCeoMetadata(siteOrSlug)
  const isManufacturing = meta.systemType === 'manufacturing' || meta.template === 'prixburg'

  if (!isManufacturing) {
    const projects = Array.isArray(meta.projects) ? meta.projects : []
    return projects.map((project) => {
      const boq = project.boqItems || []
      const targetCost = boq.reduce((sum, item) => sum + (Number(item.targetCost) || 0), 0)
      const measuredWork = boq.reduce((sum, item) => sum + (Number(item.actualMeasuredWork) || 0), 0)
      const actualCost = boq.reduce((sum, item) => sum + (Number(item.actualCostIncurred) || 0), 0)
      const variance = actualCost - measuredWork
      const progressPct = targetCost > 0 ? Math.min(100, Math.round((measuredWork / targetCost) * 100)) : 0

      const materials = project.materials || []
      const materialValueOnSite = materials.reduce(
        (sum, m) => sum + Math.max(0, (Number(m.received) || 0) - (Number(m.used) || 0)) * (Number(m.unitCost) || 0),
        0,
      )
      const materialConsumedValue = materials.reduce(
        (sum, m) => sum + (Number(m.used) || 0) * (Number(m.unitCost) || 0),
        0,
      )

      const fuelEntries = project.fuel?.entries || []
      const fuelConsumedLiters = fuelEntries.reduce((sum, e) => sum + (Number(e.liters) || 0), 0)
      const fuelConsumedCost = fuelEntries.reduce(
        (sum, e) => sum + (Number(e.liters) || 0) * (Number(e.rate) || Number(project.fuel?.ratePerLiter) || 1.62),
        0,
      )
      const fuelRemainingLiters = Math.max(
        0,
        (Number(project.fuel?.bulkInsertedLiters) || 0) - fuelConsumedLiters,
      )

      const workers = project.workers || []
      const adminCount = workers.filter((w) => w.register === 'admin').length
      const operatorCount = workers.filter((w) => w.register === 'operators').length

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
        manager: project.manager || meta.ceo || 'Site Engineer',
        status: project.status || 'active',
        startDate: project.startDate || '2026-08-28',
        summary: project.summary || '',
        metrics: {
          targetCost,
          measuredWork,
          actualCost,
          variance,
          progressPct,
          workersOnSite: workers.length,
          adminCount,
          operatorCount,
          materialLines: materials.length,
          materialValueOnSite,
          materialConsumedValue,
          fuelConsumedLiters,
          fuelConsumedCost,
          fuelRemainingLiters,
          sheqReports: (project.sheqReports || []).length,
        },
      }
    })
  }

  // Manufacturing (Prixburg template) projects / production lines overview
  const projects = Array.isArray(meta.projects) ? meta.projects : []
  const pricingMap = new Map()
  ;(meta.pricing || []).forEach((p) => {
    const qty = Number(p.quantity) || 1
    const unitPrice = qty > 0 ? (Number(p.price) || 0) / qty : 0
    pricingMap.set(String(p.name || '').toLowerCase(), unitPrice)
  })

  const rawMaterials = meta.rawMaterials || []
  const totalStoreroomValue = rawMaterials.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
    0,
  )
  const allExpenses = (meta.expenses || []).reduce(
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
  const shareExpense = projects.length > 0 ? allExpenses / projects.length : 0

  return projects.map((project) => {
    const focus = String(project.productFocus || '').toLowerCase()
    const lineProductions = (meta.productions || []).filter(
      (p) =>
        !focus ||
        String(p.product || '').toLowerCase() === focus ||
        String(p.lineProject || '').toLowerCase() === String(project.name || '').toLowerCase(),
    )
    const lineSales = (meta.salesRows || []).filter(
      (s) => !focus || String(s.item || '').toLowerCase() === focus,
    )

    const producedQty = lineProductions.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
    const rawMaterialCost = lineProductions.reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
    const soldQty = lineSales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
    const actualSales = lineSales.reduce(
      (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0),
      0,
    )
    const sellingPrice = pricingMap.get(focus) || 1.9
    const expectedSales = producedQty * sellingPrice
    const grossProfit = expectedSales - rawMaterialCost
    const totalExpenses = rawMaterialCost + shareExpense
    const netProfit = actualSales - totalExpenses
    const inStockQty = Math.max(0, producedQty - soldQty)
    const inStockValue = inStockQty * sellingPrice

    return {
      id: project.id,
      name: project.name,
      code: project.code || 'LINE',
      template: 'prixburg',
      systemType: 'manufacturing',
      companyName: meta.companyName,
      slug: meta.slug,
      subdomain: meta.subdomain,
      location: project.location || meta.location,
      manager: project.manager || meta.ceo || 'Plant Manager',
      status: project.status || 'active',
      startDate: project.startDate || '2026-10-01',
      productFocus: project.productFocus || '',
      summary: project.summary || '',
      metrics: {
        producedQty,
        soldQty,
        inStockQty,
        inStockValue,
        rawMaterialCost,
        expectedSales,
        actualSales,
        grossProfit,
        totalExpenses,
        netProfit,
        storeroomLines: rawMaterials.length,
        totalStoreroomValue,
        formulasCount: (meta.detergentFormulas || []).length,
      },
    }
  })
}
