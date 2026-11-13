import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computePrixburgCeoAnalysis,
  getSiteCeoMetadata,
  saveSiteCeoMetadata,
  subdomainLabelFor,
} from './fortressMetadata'

const money = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function PrixburgTemplate({
  site,
  initialView = 'home',
  onBack,
  backLabel = '← Fortress',
  onMetadataUpdated,
}) {
  const [meta, setMeta] = useState(() => getSiteCeoMetadata(site))
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState(() => initialView || 'home')
  const [selectedFormulaId, setSelectedFormulaId] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [gate, setGate] = useState(null)
  const metaRef = useRef(meta)
  metaRef.current = meta

  // Form drafts
  const [rawDraft, setRawDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: '',
    unit: 'kg',
    quantity: '',
    unitCost: '',
  })
  const [produceDraft, setProduceDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    formulaId: '',
    quantity: '200',
  })
  const [saleDraft, setSaleDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    item: '',
    teamLeader: '',
    customer: '',
    saleType: 'cash',
    unitPrice: '',
    quantity: '',
    paidSoFar: '',
  })
  const [expenseDraft, setExpenseDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    wages: '',
    rent: '',
    fuel: '',
    transport: '',
    lunch: '',
    other: '',
  })
  const [formulaDraft, setFormulaDraft] = useState({
    name: '',
    production: '200',
    unit: 'L',
  })
  const [ingredientDraft, setIngredientDraft] = useState({
    name: '',
    unit: 'kg',
    amount: '',
    unitPrice: '',
  })
  const [pricingDraft, setPricingDraft] = useState({
    name: '',
    unit: 'L',
    quantity: '1',
    price: '',
  })

  useEffect(() => {
    const loaded = getSiteCeoMetadata(site)
    setMeta(loaded)
    if (initialView) setView(initialView)
  }, [site?.id, site?.slug, initialView])

  const brandName = meta.brandName || meta.companyName || site?.name || 'Prixburg'
  const subdomain = subdomainLabelFor(meta)

  useEffect(() => {
    document.title = `${brandName} · Fortress Tenant`
    return () => {
      document.title = 'Fortress'
    }
  }, [brandName])

  const persistMeta = (nextMeta) => {
    const saved = saveSiteCeoMetadata(site || nextMeta.slug, nextMeta)
    setMeta(saved)
    onMetadataUpdated?.(saved)
    return saved
  }

  const requestRowDelete = (label, apply) => {
    setGate({ label, username: '', password: '', error: '', apply })
  }

  const credentialsAccepted = (username, password) => {
    const savedUser = String(meta.credentials?.settingsUsername || '').trim()
    const savedPass = String(meta.credentials?.settingsPassword || '')
    const user = String(username || '').trim()
    const pass = String(password || '')
    if (user === 'PRIXBURG CHEMICALS' && pass === 'Prixburg') return true
    return Boolean(savedUser) && user === savedUser && pass === savedPass
  }

  const submitGate = (event) => {
    event.preventDefault()
    if (!gate) return
    if (!credentialsAccepted(gate.username, gate.password)) {
      setGate({ ...gate, error: 'Those credentials do not match the detergent formula gate.' })
      return
    }
    gate.apply()
    setGate(null)
    setStatusNote('Row deleted.')
  }

  const deleteListedRow = (label, key, id) => {
    requestRowDelete(label, () => {
      const current = metaRef.current
      persistMeta({
        ...current,
        [key]: (current[key] || []).filter((row) => row.id !== id),
      })
    })
  }

  const deleteIngredientRow = (formulaId, ingredientId) => {
    requestRowDelete('ingredient', () => {
      const current = metaRef.current
      persistMeta({
        ...current,
        detergentFormulas: (current.detergentFormulas || []).map((formula) =>
          formula.id !== formulaId
            ? formula
            : {
                ...formula,
                ingredients: (formula.ingredients || []).filter((ingredient) => ingredient.id !== ingredientId),
              },
        ),
      })
    })
  }

  const rawMaterials = meta.rawMaterials || []
  const formulas = meta.detergentFormulas || []
  const pricing = meta.pricing || []
  const movements = meta.stockMovements || []
  const productions = meta.productions || []
  const salesRows = meta.salesRows || []
  const expenses = meta.expenses || []

  const ceoAnalysis = useMemo(() => computePrixburgCeoAnalysis(meta), [meta])

  const storeroomTotal = rawMaterials.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
    0,
  )

  const sellingPriceFor = (productName) => {
    const row = pricing.find(
      (p) => String(p.name || '').trim().toLowerCase() === String(productName || '').trim().toLowerCase(),
    )
    if (!row) return 0
    const q = Number(row.quantity) || 1
    return q > 0 ? (Number(row.price) || 0) / q : 0
  }

  // Finished products inventory (produced minus sold)
  const finishedProducts = useMemo(() => {
    const map = new Map()
    productions.forEach((p) => {
      const key = String(p.product || '').trim().toLowerCase()
      if (!key) return
      const cur = map.get(key) || { name: p.product, unit: p.unit || 'L', produced: 0, sold: 0 }
      cur.produced += Number(p.quantity) || 0
      map.set(key, cur)
    })
    salesRows.forEach((s) => {
      const key = String(s.item || '').trim().toLowerCase()
      if (!key) return
      const cur = map.get(key) || { name: s.item, unit: 'L', produced: 0, sold: 0 }
      cur.sold += Number(s.quantity) || 0
      map.set(key, cur)
    })
    return [...map.values()].map((item) => {
      const inStock = Math.max(0, item.produced - item.sold)
      const unitPrice = sellingPriceFor(item.name)
      return {
        ...item,
        inStock,
        unitPrice,
        stockValue: inStock * unitPrice,
      }
    })
  }, [productions, salesRows, pricing])

  const creditCustomerRows = useMemo(() => {
    return salesRows
      .filter((s) => s.saleType === 'credit')
      .map((s) => {
        const credit = (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0)
        const paid = Number(s.paidSoFar) || 0
        return {
          id: s.id,
          date: s.date,
          customer: s.customer || 'Customer',
          item: s.item || '',
          credit,
          paid,
          balance: Math.max(0, credit - paid),
        }
      })
  }, [salesRows])

  // Handlers
  const handleAddRawMaterial = (event) => {
    event.preventDefault()
    const name = rawDraft.name.trim()
    const qty = Number(rawDraft.quantity) || 0
    if (!name) return
    const nextMaterials = [
      ...rawMaterials,
      {
        id: `rm-${Date.now()}`,
        date: rawDraft.date || new Date().toISOString().slice(0, 10),
        name,
        unit: rawDraft.unit || 'kg',
        quantity: qty,
        qtyFormula: String(qty),
        unitCost: Number(rawDraft.unitCost) || 0,
      },
    ]
    const nextMovements = [
      {
        id: `mov-${Date.now()}`,
        type: 'purchase',
        at: new Date().toISOString(),
        material: name,
        unit: rawDraft.unit || 'kg',
        quantity: qty,
        remainingMaterial: qty,
        remainingStock: nextMaterials.map((m) => `${m.quantity} ${m.unit} ${m.name}`).join(', '),
      },
      ...movements,
    ]
    persistMeta({ ...meta, rawMaterials: nextMaterials, stockMovements: nextMovements })
    setRawDraft({
      date: new Date().toISOString().slice(0, 10),
      name: '',
      unit: 'kg',
      quantity: '',
      unitCost: '',
    })
  }

  const handleProduceBatch = (event) => {
    event.preventDefault()
    const formula = formulas.find((f) => f.id === (produceDraft.formulaId || formulas[0]?.id))
    const batchQty = Number(produceDraft.quantity) || 0
    if (!formula || !(batchQty > 0)) return

    const baseYield = Number(formula.production) || 200
    const scale = batchQty / baseYield
    const updatedMaterials = rawMaterials.map((m) => ({ ...m }))
    const usedList = []
    let batchCost = 0

    ;(formula.ingredients || []).forEach((ing) => {
      const needQty = Number(((Number(ing.amount) || 0) * scale).toFixed(3))
      if (!(needQty > 0)) return
      const match = updatedMaterials.find(
        (m) => String(m.name || '').toLowerCase() === String(ing.name || '').toLowerCase(),
      )
      const unitCost = match ? Number(match.unitCost) || 0 : Number(ing.unitPrice) || 0
      batchCost += needQty * unitCost
      if (match) {
        match.quantity = Math.max(0, Number((Number(match.quantity) - needQty).toFixed(3)))
        match.qtyFormula = String(match.quantity)
      }
      usedList.push({
        name: ing.name,
        amount: needQty,
        unit: ing.unit || 'kg',
      })
    })

    const prodRecord = {
      id: `prod-${Date.now()}`,
      date: produceDraft.date || new Date().toISOString().slice(0, 10),
      product: formula.name,
      unit: formula.unit || 'L',
      quantity: batchQty,
      cost: Number(batchCost.toFixed(2)),
    }

    const movRecord = {
      id: `mov-${Date.now()}`,
      type: 'production',
      at: new Date().toISOString(),
      product: formula.name,
      productQty: batchQty,
      productUnit: formula.unit || 'L',
      cost: Number(batchCost.toFixed(2)),
      used: usedList,
      remainingStock: updatedMaterials
        .slice(0, 4)
        .map((m) => `${m.name} ${m.quantity} ${m.unit} left`)
        .join(' | '),
    }

    persistMeta({
      ...meta,
      rawMaterials: updatedMaterials,
      productions: [prodRecord, ...productions],
      stockMovements: [movRecord, ...movements],
    })
    setStatusNote(`Produced ${batchQty} ${formula.unit || 'L'} of ${formula.name}.`)
  }

  const handleAddSale = (event) => {
    event.preventDefault()
    const item = saleDraft.item.trim() || formulas[0]?.name || 'Detergent'
    const qty = Number(saleDraft.quantity) || 0
    if (!(qty > 0)) return
    const defaultPrice = sellingPriceFor(item)
    const unitPrice = saleDraft.unitPrice !== '' ? Number(saleDraft.unitPrice) : defaultPrice
    const nextSales = [
      {
        id: `sale-${Date.now()}`,
        date: saleDraft.date || new Date().toISOString().slice(0, 10),
        item,
        teamLeader: saleDraft.teamLeader.trim() || 'Sales Lead',
        customer: saleDraft.customer.trim() || 'Customer',
        saleType: saleDraft.saleType || 'cash',
        unitPrice,
        quantity: qty,
        paidSoFar: saleDraft.saleType === 'credit' ? Number(saleDraft.paidSoFar) || 0 : qty * unitPrice,
      },
      ...salesRows,
    ]
    persistMeta({ ...meta, salesRows: nextSales })
    setSaleDraft({
      date: new Date().toISOString().slice(0, 10),
      item: '',
      teamLeader: '',
      customer: '',
      saleType: 'cash',
      unitPrice: '',
      quantity: '',
      paidSoFar: '',
    })
  }

  const handleAddExpense = (event) => {
    event.preventDefault()
    const nextExpenses = [
      {
        id: `exp-${Date.now()}`,
        date: expenseDraft.date || new Date().toISOString().slice(0, 10),
        wages: Number(expenseDraft.wages) || 0,
        rent: Number(expenseDraft.rent) || 0,
        fuel: Number(expenseDraft.fuel) || 0,
        transport: Number(expenseDraft.transport) || 0,
        lunch: Number(expenseDraft.lunch) || 0,
        other: Number(expenseDraft.other) || 0,
      },
      ...expenses,
    ]
    persistMeta({ ...meta, expenses: nextExpenses })
    setExpenseDraft({
      date: new Date().toISOString().slice(0, 10),
      wages: '',
      rent: '',
      fuel: '',
      transport: '',
      lunch: '',
      other: '',
    })
  }

  const handleCreateFormula = (event) => {
    event.preventDefault()
    const name = formulaDraft.name.trim()
    if (!name) return
    const created = {
      id: `formula-${Date.now()}`,
      name,
      production: Number(formulaDraft.production) || 200,
      unit: formulaDraft.unit || 'L',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ingredients: [],
    }
    persistMeta({ ...meta, detergentFormulas: [...formulas, created] })
    setSelectedFormulaId(created.id)
    setFormulaDraft({ name: '', production: '200', unit: 'L' })
  }

  const handleAddIngredient = (event) => {
    event.preventDefault()
    const activeFormula = formulas.find((f) => f.id === (selectedFormulaId || formulas[0]?.id))
    if (!activeFormula || !ingredientDraft.name.trim()) return
    const nextFormulas = formulas.map((f) =>
      f.id === activeFormula.id
        ? {
            ...f,
            ingredients: [
              ...(f.ingredients || []),
              {
                id: `ing-${Date.now()}`,
                name: ingredientDraft.name.trim(),
                unit: ingredientDraft.unit || 'kg',
                amount: Number(ingredientDraft.amount) || 0,
                qtyFormula: String(Number(ingredientDraft.amount) || 0),
                unitPrice: Number(ingredientDraft.unitPrice) || 0,
              },
            ],
          }
        : f,
    )
    persistMeta({ ...meta, detergentFormulas: nextFormulas })
    setIngredientDraft({ name: '', unit: 'kg', amount: '', unitPrice: '' })
  }

  const handleAddPricing = (event) => {
    event.preventDefault()
    if (!pricingDraft.name.trim()) return
    const nextPricing = [
      ...pricing,
      {
        id: `price-${Date.now()}`,
        name: pricingDraft.name.trim(),
        unit: pricingDraft.unit || 'L',
        quantity: Number(pricingDraft.quantity) || 1,
        price: Number(pricingDraft.price) || 0,
      },
    ]
    persistMeta({ ...meta, pricing: nextPricing })
    setPricingDraft({ name: '', unit: 'L', quantity: '1', price: '' })
  }

  const activeFormula = formulas.find((f) => f.id === (selectedFormulaId || formulas[0]?.id)) || null

  return (
    <div className="pb-app">
      <main className="pb-main">
        {/* Exact Prixburg Topbar */}
        <div className="pb-topbar">
          <div className="pb-topbar-left">
            <div className="pb-menu-wrap">
              <button
                type="button"
                className="pb-dropdown-btn"
                onClick={() => setMenuOpen((o) => !o)}
                title="Menu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </button>
              <button
                type="button"
                className="pb-fortress-brand"
                onClick={() => {
                  setView('home')
                  setMenuOpen(false)
                }}
                title={`${brandName} under Fortress (${subdomain})`}
              >
                <span className="pb-fortress-f">F</span>
                <span className="pb-fortress-name">{brandName}</span>
              </button>
              <span className="tpl-subdomain-pill">{subdomain}</span>

              {menuOpen && (
                <div className="pb-dropdown-content show">
                  <button
                    type="button"
                    className="pb-menu-btn"
                    onClick={() => {
                      setView('home')
                      setMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 11l9-8 9 8" />
                      <path d="M5 10v11h14V10" />
                      <path d="M10 21v-6h4v6" />
                    </svg>
                    Home
                  </button>
                  <button
                    type="button"
                    className="pb-menu-btn"
                    onClick={() => {
                      setView('manufacturing-factory')
                      setMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 21h18" />
                      <path d="M5 21V10l5 3V10l5 3V5h4v16" />
                    </svg>
                    Manufacturing factory
                  </button>
                  <button
                    type="button"
                    className="pb-menu-btn"
                    onClick={() => {
                      setView('sales-finance')
                      setMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                      <path d="M6 15h2" />
                    </svg>
                    Sales and finance
                  </button>
                  <button
                    type="button"
                    className="pb-menu-btn"
                    onClick={() => {
                      setView('settings')
                      setMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3h6" />
                      <path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3" />
                      <path d="M8.5 14h7" />
                    </svg>
                    Product setup (Formulas &amp; Pricing)
                  </button>
                  <button
                    type="button"
                    className="pb-menu-btn"
                    onClick={() => {
                      setView('ceo-analysis')
                      setMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3v18h18" />
                      <path d="M7 14v4" />
                      <path d="M12 9v9" />
                      <path d="M17 5v13" />
                    </svg>
                    CEO Analysis
                  </button>
                </div>
              )}
            </div>

            {view !== 'home' && (
              <h2 className="pb-page-heading">
                <button
                  type="button"
                  className="pb-page-back"
                  onClick={() => {
                    if (view === 'ceo-net-profit' || view === 'ceo-gross-profit') {
                      setView('ceo-analysis')
                    } else if (
                      view === 'raw-materials' ||
                      view === 'production-reports' ||
                      view === 'finished-products'
                    ) {
                      setView('manufacturing-factory')
                    } else if (
                      view === 'raw-materials-storeroom' ||
                      view === 'raw-material-movements'
                    ) {
                      setView('raw-materials')
                    } else if (
                      view === 'sales-analysis-reports' ||
                      view === 'profit-expense-reports' ||
                      view === 'outstanding-credit'
                    ) {
                      setView('sales-finance')
                    } else {
                      setView('home')
                    }
                  }}
                >
                  ←{' '}
                  {view === 'ceo-net-profit' || view === 'ceo-gross-profit'
                    ? 'CEO Analysis'
                    : view === 'raw-materials' ||
                        view === 'production-reports' ||
                        view === 'finished-products'
                      ? 'Manufacturing factory'
                      : view === 'raw-materials-storeroom' || view === 'raw-material-movements'
                        ? 'Raw materials'
                        : view === 'sales-analysis-reports' ||
                            view === 'profit-expense-reports' ||
                            view === 'outstanding-credit'
                          ? 'Sales and finance'
                          : 'Home'}
                </button>
              </h2>
            )}
          </div>

          <div className="pb-topbar-actions">
            <button
              type="button"
              className="pb-icon-btn"
              onClick={() => setView('settings')}
              title="Settings"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
            {onBack && (
              <button
                type="button"
                className="tpl-action-btn tpl-back-fortress"
                onClick={onBack}
              >
                {backLabel}
              </button>
            )}
          </div>
        </div>

        {statusNote ? (
          <div className="tpl-notice-ok" style={{ marginBottom: 16 }}>
            <span>{statusNote}</span>
            <button type="button" className="tpl-close-x" onClick={() => setStatusNote('')}>
              ×
            </button>
          </div>
        ) : null}

        {/* Exact Prixburg Home Stage */}
        {view === 'home' && (
          <div className="pb-home-stage">
            <h1 className="pb-home-logo">
              {brandName}
              <sup className="pb-tm">&trade;</sup>
            </h1>
          </div>
        )}

        {/* Exact Prixburg CEO Analysis Page (`ceo-analysis.html`) */}
        {view === 'ceo-analysis' && (
          <div className="pb-panel">
            <h3>CEO Analysis</h3>
            <div className="pb-choice-grid">
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('ceo-net-profit')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
                CEO Net Profit
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('ceo-gross-profit')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3h6" />
                  <path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3" />
                  <path d="M8.5 14h7" />
                </svg>
                CEO Gross Profit
              </button>
            </div>
          </div>
        )}

        {/* Exact Prixburg CEO Net Profit Page (`ceo-net-profit.html`) */}
        {view === 'ceo-net-profit' && (
          <>
            <div className="pb-sales-cards">
              <div className="pb-sales-card">
                <span>Today total sales $</span>
                <strong>{money(ceoAnalysis.netProfitRows[0]?.sales || 0)}</strong>
              </div>
              <div className="pb-sales-card">
                <span>Today total expenses $</span>
                <strong>{money(ceoAnalysis.netProfitRows[0]?.expenses || 0)}</strong>
              </div>
              <div className="pb-sales-card">
                <span>Today net profit $</span>
                <strong>{money(ceoAnalysis.netProfitRows[0]?.profit || 0)}</strong>
              </div>
              <div className="pb-sales-card">
                <span>Outstanding credit $</span>
                <strong>{money(ceoAnalysis.outstandingCredit || 0)}</strong>
              </div>
            </div>

            <div className="pb-panel">
              <div className="pb-table-toolbar">
                <div>
                  <h3>CEO Net Profit</h3>
                  <p className="pb-dashboard-range">
                    Total sales come from sales entry. Net profit is total sales minus expenses.
                  </p>
                </div>
              </div>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Total sales</th>
                      <th>Total expenses</th>
                      <th>Net profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ceoAnalysis.netProfitRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{money(row.sales)}</td>
                        <td>{money(row.expenses)}</td>
                        <td>
                          <strong>{money(row.profit)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Exact Prixburg CEO Gross Profit Page (`ceo-gross-profit.html`) */}
        {view === 'ceo-gross-profit' && (
          <>
            <div className="pb-sales-cards">
              <div className="pb-sales-card">
                <span>Today expected sales $</span>
                <strong>{money(ceoAnalysis.grossProfitRows[0]?.expectedSales || 0)}</strong>
              </div>
              <div className="pb-sales-card">
                <span>Today cost of raw materials $</span>
                <strong>{money(ceoAnalysis.grossProfitRows[0]?.cost || 0)}</strong>
              </div>
              <div className="pb-sales-card">
                <span>Today expected gross profit $</span>
                <strong>{money(ceoAnalysis.grossProfitRows[0]?.gross || 0)}</strong>
              </div>
            </div>

            <div className="pb-panel">
              <div className="pb-table-toolbar">
                <div>
                  <h3>CEO Gross Profit</h3>
                  <p className="pb-dashboard-range">
                    Expected sales come from production and pricing. Expected gross profit is expected sales minus the cost of raw materials.
                  </p>
                </div>
              </div>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Expected sales</th>
                      <th>Cost of raw materials</th>
                      <th>Expected gross profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ceoAnalysis.grossProfitRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{money(row.expectedSales)}</td>
                        <td>{money(row.cost)}</td>
                        <td>
                          <strong>{money(row.gross)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Exact Prixburg Manufacturing Factory Page (`manufacturing-factory.html`) */}
        {view === 'manufacturing-factory' && (
          <div className="pb-panel">
            <h3>Manufacturing factory</h3>
            <div className="pb-choice-grid">
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('raw-materials')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.3 7L12 12l8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                Raw materials
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('production-reports')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3h6" />
                  <path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3" />
                  <path d="M8.5 14h7" />
                </svg>
                Production report
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('finished-products')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M12 8v8" />
                  <path d="M8.5 12h7" />
                </svg>
                Finished products
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('settings')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3h6" />
                  <path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3" />
                  <path d="M8.5 14h7" />
                </svg>
                Product setup (Detergent formulas &amp; Pricing)
              </button>
            </div>
          </div>
        )}

        {/* Exact Prixburg Raw Materials Page (`raw-materials.html`) */}
        {view === 'raw-materials' && (
          <div className="pb-panel">
            <div className="pb-choice-grid">
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('raw-materials-storeroom')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9l9-6 9 6" />
                  <path d="M4 10v10h16V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
                Store room
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('raw-material-movements')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7h11l-3-3" />
                  <path d="M18 7l-3 3" />
                  <path d="M17 17H6l3 3" />
                  <path d="M6 17l3-3" />
                </svg>
                Movement history
              </button>
            </div>
          </div>
        )}

        {/* Raw Materials Storeroom (`raw-materials-storeroom.html`) */}
        {view === 'raw-materials-storeroom' && (
          <div className="pb-panel">
            <h3>Raw materials storeroom</h3>
            {rawMaterials.length === 0 ? (
              <p className="tpl-muted-line">No raw materials in the storeroom yet. Add materials below.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Material</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Total Cost</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td><strong>{row.name}</strong></td>
                        <td>{row.unit}</td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className="tpl-inline-input"
                            value={row.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              persistMeta({
                                ...meta,
                                rawMaterials: rawMaterials.map((m) =>
                                  m.id === row.id ? { ...m, quantity: val, qtyFormula: String(val) } : m,
                                ),
                              })
                            }}
                          />
                        </td>
                        <td>{money(row.unitCost)}</td>
                        <td>{money((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))}</td>
                        <td>
                          <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('raw material', 'rawMaterials', row.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan="6">Storeroom Total</th>
                      <th>{money(storeroomTotal)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <form className="tpl-inline-form" onSubmit={handleAddRawMaterial}>
              <h4>Add material to storeroom</h4>
              <div className="tpl-form-row">
                <input
                  type="date"
                  value={rawDraft.date}
                  onChange={(e) => setRawDraft({ ...rawDraft, date: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Material name"
                  value={rawDraft.name}
                  onChange={(e) => setRawDraft({ ...rawDraft, name: e.target.value })}
                  required
                />
                <select
                  value={rawDraft.unit}
                  onChange={(e) => setRawDraft({ ...rawDraft, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pcs">pcs</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Quantity"
                  value={rawDraft.quantity}
                  onChange={(e) => setRawDraft({ ...rawDraft, quantity: e.target.value })}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit cost ($)"
                  value={rawDraft.unitCost}
                  onChange={(e) => setRawDraft({ ...rawDraft, unitCost: e.target.value })}
                  required
                />
                <button type="submit" className="tpl-primary-btn">Add Material</button>
              </div>
            </form>
          </div>
        )}

        {/* Raw Material Movements (`raw-material-movements.html`) */}
        {view === 'raw-material-movements' && (
          <div className="pb-panel">
            <h3>Movement history</h3>
            {movements.length === 0 ? (
              <p className="tpl-muted-line">
                No movements yet. Purchases in the storeroom and Produce on a daily file will appear here.
              </p>
            ) : (
              <div className="tpl-batch-list">
                {movements.map((batch) => (
                  <article key={batch.id} className="tpl-batch-card">
                    <div className="tpl-batch-top">
                      <span className="tpl-code-badge">
                        {batch.type === 'purchase' ? 'Purchase' : 'Production'}
                      </span>
                      <small>{new Date(batch.at).toLocaleString()}</small>
                    </div>
                    {batch.type === 'purchase' ? (
                      <p>
                        <strong>Amount added/purchased:</strong> +{batch.quantity} {batch.unit} {batch.material} ·{' '}
                        <strong>Current available:</strong> {batch.remainingMaterial} {batch.unit}
                      </p>
                    ) : (
                      <>
                        <p>
                          <strong>Quantity of raw material used:</strong>{' '}
                          {(batch.used || []).map((u) => `${u.name} ${u.amount} ${u.unit}`).join(' | ')}
                        </p>
                        <p>
                          <strong>Quantity of detergent produced:</strong> {batch.productQty} {batch.productUnit}{' '}
                          {batch.product}
                        </p>
                      </>
                    )}
                    {batch.remainingStock ? (
                      <p className="tpl-muted-line">
                        <strong>Remaining stock:</strong> {batch.remainingStock}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Production Reports (`production-reports.html` & `production.html`) */}
        {view === 'production-reports' && (
          <div className="pb-panel">
            <h3>Production report</h3>
            <p className="pb-dashboard-range">
              Produce a batch from a detergent formula to automatically deduct raw materials from the storeroom.
            </p>
            {formulas.length > 0 ? (
              <form className="tpl-inline-form" onSubmit={handleProduceBatch} style={{ marginBottom: 16 }}>
                <h4>Production entry</h4>
                <div className="tpl-form-row">
                  <input
                    type="date"
                    value={produceDraft.date}
                    onChange={(e) => setProduceDraft({ ...produceDraft, date: e.target.value })}
                  />
                  <select
                    value={produceDraft.formulaId || formulas[0]?.id || ''}
                    onChange={(e) => setProduceDraft({ ...produceDraft, formulaId: e.target.value })}
                  >
                    {formulas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (Formula base: {f.production} {f.unit || 'L'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Quantity produced"
                    value={produceDraft.quantity}
                    onChange={(e) => setProduceDraft({ ...produceDraft, quantity: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Produce</button>
                </div>
              </form>
            ) : (
              <p className="tpl-muted-line">
                No detergent formulas yet. Add a formula under Settings → Detergent formulas first.
              </p>
            )}

            {productions.length === 0 ? (
              <p className="tpl-muted-line">No production in this period yet.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Detergent</th>
                      <th>Quantity Produced</th>
                      <th>Cost of Raw Materials</th>
                      <th>Expected Sales</th>
                      <th>Expected Gross Profit</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((prod) => {
                      const expected = (Number(prod.quantity) || 0) * sellingPriceFor(prod.product)
                      const gross = expected - (Number(prod.cost) || 0)
                      return (
                        <tr key={prod.id}>
                          <td>{prod.date}</td>
                          <td><strong>{prod.product}</strong></td>
                          <td>{prod.quantity} {prod.unit}</td>
                          <td>{money(prod.cost)}</td>
                          <td>{money(expected)}</td>
                          <td>{money(gross)}</td>
                          <td>
                            <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('production batch', 'productions', prod.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Exact Prixburg Finished Products (`finished-products.html`) */}
        {view === 'finished-products' && (
          <div className="pb-panel">
            <div className="pb-table-toolbar">
              <div>
                <h3>Finished products</h3>
                <p className="pb-dashboard-range">
                  Stock comes from production entry. Matching sales entry quantities are subtracted automatically.
                </p>
              </div>
            </div>
            {finishedProducts.length === 0 ? (
              <p className="tpl-muted-line">No finished detergent in stock yet.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Detergent name</th>
                      <th>Unit</th>
                      <th>Total detergent quantity in stock</th>
                      <th>Total detergent in stock $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedProducts.map((item) => (
                      <tr key={item.name}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.unit}</td>
                        <td>{item.inStock}</td>
                        <td>{money(item.stockValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Exact Prixburg Sales and Finance (`sales-finance.html`) */}
        {view === 'sales-finance' && (
          <div className="pb-panel">
            <h3>Sales and finance</h3>
            <div className="pb-choice-grid">
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('sales-analysis-reports')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 19V5" />
                  <path d="M4 19h16" />
                  <rect x="7" y="10" width="3" height="6" />
                  <rect x="12" y="7" width="3" height="9" />
                  <rect x="17" y="12" width="3" height="4" />
                </svg>
                Sales analysis report
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('profit-expense-reports')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
                Profit and expense reports
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setView('outstanding-credit')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Outstanding credit report
              </button>
            </div>
          </div>
        )}

        {/* Sales Analysis Report (`sales-analysis-reports.html`) */}
        {view === 'sales-analysis-reports' && (
          <div className="pb-panel">
            <h3>Sales analysis report & sales entry</h3>
            {salesRows.length === 0 ? (
              <p className="tpl-muted-line">No sales entries yet. Record a sale below.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Team Leader</th>
                      <th>Customer</th>
                      <th>Sale Type</th>
                      <th>Unit Price</th>
                      <th>Quantity</th>
                      <th>Total $</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td><strong>{row.item}</strong></td>
                        <td>{row.teamLeader}</td>
                        <td>{row.customer}</td>
                        <td>{row.saleType}</td>
                        <td>{money(row.unitPrice)}</td>
                        <td>{row.quantity}</td>
                        <td>{money((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}</td>
                        <td>
                          <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('sale', 'salesRows', row.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form className="tpl-inline-form" onSubmit={handleAddSale}>
              <h4>Sales entry</h4>
              <div className="tpl-form-row">
                <input
                  type="date"
                  value={saleDraft.date}
                  onChange={(e) => setSaleDraft({ ...saleDraft, date: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Detergent / Item"
                  value={saleDraft.item}
                  onChange={(e) => setSaleDraft({ ...saleDraft, item: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Customer"
                  value={saleDraft.customer}
                  onChange={(e) => setSaleDraft({ ...saleDraft, customer: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Team leader"
                  value={saleDraft.teamLeader}
                  onChange={(e) => setSaleDraft({ ...saleDraft, teamLeader: e.target.value })}
                />
                <select
                  value={saleDraft.saleType}
                  onChange={(e) => setSaleDraft({ ...saleDraft, saleType: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
                <input
                  type="number"
                  step="1"
                  placeholder="Quantity"
                  value={saleDraft.quantity}
                  onChange={(e) => setSaleDraft({ ...saleDraft, quantity: e.target.value })}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit price ($)"
                  value={saleDraft.unitPrice}
                  onChange={(e) => setSaleDraft({ ...saleDraft, unitPrice: e.target.value })}
                />
                <button type="submit" className="tpl-primary-btn">Save Sale</button>
              </div>
            </form>
          </div>
        )}

        {/* Profit & Expense Reports (`profit-expense-reports.html`) */}
        {view === 'profit-expense-reports' && (
          <div className="pb-panel">
            <h3>Profit and expense reports</h3>
            {expenses.length === 0 ? (
              <p className="tpl-muted-line">No expenses entered yet.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Wages</th>
                      <th>Rent</th>
                      <th>Fuel Delivery</th>
                      <th>Transport</th>
                      <th>Lunch</th>
                      <th>Other</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => {
                      const dayTotal =
                        (Number(e.wages) || 0) +
                        (Number(e.rent) || 0) +
                        (Number(e.fuel) || 0) +
                        (Number(e.transport) || 0) +
                        (Number(e.lunch) || 0) +
                        (Number(e.other) || 0)
                      return (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td>{money(e.wages)}</td>
                          <td>{money(e.rent)}</td>
                          <td>{money(e.fuel)}</td>
                          <td>{money(e.transport)}</td>
                          <td>{money(e.lunch)}</td>
                          <td>{money(e.other)}</td>
                          <td><strong>{money(dayTotal)}</strong></td>
                          <td>
                            <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('expense', 'expenses', e.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <form className="tpl-inline-form" onSubmit={handleAddExpense}>
              <h4>Expenses entry</h4>
              <div className="tpl-form-row">
                <input
                  type="date"
                  value={expenseDraft.date}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Wages ($)"
                  value={expenseDraft.wages}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, wages: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Rent ($)"
                  value={expenseDraft.rent}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, rent: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Fuel ($)"
                  value={expenseDraft.fuel}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, fuel: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Transport ($)"
                  value={expenseDraft.transport}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, transport: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Lunch ($)"
                  value={expenseDraft.lunch}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, lunch: e.target.value })}
                />
                <button type="submit" className="tpl-primary-btn">Save Expense</button>
              </div>
            </form>
          </div>
        )}

        {/* Outstanding Credit Report (`outstanding-credit.html`) */}
        {view === 'outstanding-credit' && (
          <div className="pb-panel">
            <h3>Outstanding credit report</h3>
            {creditCustomerRows.length === 0 ? (
              <p className="tpl-muted-line">No outstanding credit yet.</p>
            ) : (
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Total credit sales $</th>
                      <th>Paid so far $</th>
                      <th>Outstanding credit $</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditCustomerRows.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.customer}</strong></td>
                        <td>{money(row.credit)}</td>
                        <td>{money(row.paid)}</td>
                        <td><strong>{money(row.balance)}</strong></td>
                        <td>{row.date}</td>
                        <td>
                          <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('credit sale', 'salesRows', row.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings (`settings.html`) */}
        {view === 'settings' && (
          <>
            <div className="pb-panel">
              <h3>Formulas & Pricing</h3>
              <div className="tpl-head-pills" style={{ marginBottom: 12 }}>
                {formulas.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={activeFormula?.id === f.id ? 'tpl-primary-btn' : 'tpl-secondary-btn'}
                    onClick={() => setSelectedFormulaId(f.id)}
                  >
                    {f.name} ({f.production} {f.unit || 'L'})
                  </button>
                ))}
              </div>

              {activeFormula && (
                <div style={{ marginBottom: 16 }}>
                  <h4>
                    Formula: {activeFormula.name} — Produced: {activeFormula.production} {activeFormula.unit || 'L'}
                  </h4>
                  <div className="tpl-table-wrap">
                    <table className="tpl-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Unit</th>
                          <th>Amount</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeFormula.ingredients || []).map((ing) => (
                          <tr key={ing.id}>
                            <td><strong>{ing.name}</strong></td>
                            <td>{ing.unit}</td>
                            <td>{ing.amount}</td>
                            <td>{money(ing.unitPrice)}</td>
                            <td>{money((Number(ing.amount) || 0) * (Number(ing.unitPrice) || 0))}</td>
                            <td>
                              <button type="button" className="tpl-danger-btn" onClick={() => deleteIngredientRow(activeFormula.id, ing.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form className="tpl-inline-form" onSubmit={handleAddIngredient}>
                    <h4>Add Ingredient to {activeFormula.name}</h4>
                    <div className="tpl-form-row">
                      <input
                        type="text"
                        placeholder="Ingredient"
                        value={ingredientDraft.name}
                        onChange={(e) => setIngredientDraft({ ...ingredientDraft, name: e.target.value })}
                        required
                      />
                      <select
                        value={ingredientDraft.unit}
                        onChange={(e) => setIngredientDraft({ ...ingredientDraft, unit: e.target.value })}
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={ingredientDraft.amount}
                        onChange={(e) => setIngredientDraft({ ...ingredientDraft, amount: e.target.value })}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit price ($)"
                        value={ingredientDraft.unitPrice}
                        onChange={(e) => setIngredientDraft({ ...ingredientDraft, unitPrice: e.target.value })}
                        required
                      />
                      <button type="submit" className="tpl-primary-btn">Add Ingredient</button>
                    </div>
                  </form>
                </div>
              )}

              <form className="tpl-inline-form" onSubmit={handleCreateFormula}>
                <h4>Create Detergent Formula</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Detergent file name"
                    value={formulaDraft.name}
                    onChange={(e) => setFormulaDraft({ ...formulaDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Production yield (L)"
                    value={formulaDraft.production}
                    onChange={(e) => setFormulaDraft({ ...formulaDraft, production: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Create Formula</button>
                </div>
              </form>
            </div>

            <div className="pb-panel">
              <h3>Pricing files</h3>
              {pricing.length > 0 && (
                <div className="tpl-table-wrap">
                  <table className="tpl-table">
                    <thead>
                      <tr>
                        <th>Detergent</th>
                        <th>Unit</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Unit Selling Price</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing.map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.unit}</td>
                          <td>{p.quantity}</td>
                          <td>{money(p.price)}</td>
                          <td>{money((Number(p.price) || 0) / (Number(p.quantity) || 1))}</td>
                          <td>
                            <button type="button" className="tpl-danger-btn" onClick={() => deleteListedRow('price', 'pricing', p.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form className="tpl-inline-form" onSubmit={handleAddPricing}>
                <h4>Add Pricing Row</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Detergent name"
                    value={pricingDraft.name}
                    onChange={(e) => setPricingDraft({ ...pricingDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Selling price per L ($)"
                    value={pricingDraft.price}
                    onChange={(e) => setPricingDraft({ ...pricingDraft, price: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Add Price</button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
      {gate ? (
        <div className="tpl-gate-backdrop" role="presentation" onClick={() => setGate(null)}>
          <form
            className="tpl-gate-card"
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitGate}
          >
            <h3>Delete {gate.label}</h3>
            <p>Enter the detergent formula username and password. The row is removed only after those credentials are accepted.</p>
            <input
              type="text"
              autoComplete="username"
              placeholder="Username"
              value={gate.username}
              onChange={(event) => setGate({ ...gate, username: event.target.value, error: '' })}
              required
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={gate.password}
              onChange={(event) => setGate({ ...gate, password: event.target.value, error: '' })}
              required
            />
            {gate.error ? <p className="tpl-gate-error">{gate.error}</p> : null}
            <div className="tpl-hero-btns">
              <button type="button" className="tpl-secondary-btn" onClick={() => setGate(null)}>
                Cancel
              </button>
              <button type="submit" className="tpl-danger-btn">
                Delete
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
