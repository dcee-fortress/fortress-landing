import { useEffect, useMemo, useState } from 'react'
import {
  computeSiteProjectsOverview,
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
  initialProjectId = '',
  initialView = 'home',
  onBack,
  onMetadataUpdated,
}) {
  const [meta, setMeta] = useState(() => getSiteCeoMetadata(site))
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState(() => initialView || 'home')
  const [selectedFormulaId, setSelectedFormulaId] = useState('')
  const [statusNote, setStatusNote] = useState('')

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
  const [newLineDraft, setNewLineDraft] = useState({
    name: '',
    code: '',
    location: '',
    productFocus: '',
    summary: '',
  })

  useEffect(() => {
    const loaded = getSiteCeoMetadata(site)
    setMeta(loaded)
    if (initialView && initialView !== 'home') {
      setView(initialView)
    } else if (initialProjectId) {
      setView('manufacturing-factory')
    }
  }, [site?.id, site?.slug, initialProjectId, initialView])

  useEffect(() => {
    const title = meta.brandName || meta.companyName || site?.name || 'Prixburg'
    document.title = `${title} · Manufacturing Platform`
    return () => {
      document.title = 'Fortress'
    }
  }, [meta.brandName, meta.companyName, site?.name])

  const persistMeta = (nextMeta) => {
    const saved = saveSiteCeoMetadata(site || nextMeta.slug, nextMeta)
    setMeta(saved)
    onMetadataUpdated?.(saved)
    return saved
  }

  const brandName = meta.brandName || meta.companyName || site?.name || 'Prixburg'
  const subdomain = subdomainLabelFor(meta)
  const overviews = useMemo(() => computeSiteProjectsOverview(meta), [meta])

  const rawMaterials = meta.rawMaterials || []
  const formulas = meta.detergentFormulas || []
  const pricing = meta.pricing || []
  const movements = meta.stockMovements || []
  const productions = meta.productions || []
  const salesRows = meta.salesRows || []
  const expenses = meta.expenses || []
  const projects = meta.projects || []

  const storeroomTotal = rawMaterials.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
    0,
  )

  const sellingPriceFor = (productName) => {
    const row = pricing.find(
      (p) => String(p.name || '').trim().toLowerCase() === String(productName || '').trim().toLowerCase(),
    )
    if (!row) return 1.9
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

  // Financial summaries
  const totalSalesRevenue = salesRows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0,
  )
  const cashSalesRevenue = salesRows
    .filter((r) => r.saleType !== 'credit')
    .reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0)
  const creditRows = salesRows.filter((r) => r.saleType === 'credit')
  const creditTotal = creditRows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0,
  )
  const creditPaid = creditRows.reduce((sum, r) => sum + (Number(r.paidSoFar) || 0), 0)
  const creditOutstanding = Math.max(0, creditTotal - creditPaid)

  const totalRawMaterialProductionCost = productions.reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
  const totalEnteredExpenses = expenses.reduce(
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
  const totalCombinedExpenses = totalRawMaterialProductionCost + totalEnteredExpenses
  const totalNetProfit = totalSalesRevenue - totalCombinedExpenses

  const totalExpectedSales = productions.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0) * sellingPriceFor(p.product),
    0,
  )
  const totalExpectedGrossProfit = totalExpectedSales - totalRawMaterialProductionCost

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
      lineProject:
        projects.find((p) => p.formulaId === formula.id || p.productFocus === formula.name)?.name ||
        `${formula.name} Line`,
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
    setStatusNote(`Produced ${batchQty} ${formula.unit || 'L'} of ${formula.name}. Storeroom stock automatically deducted.`)
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

  const handleAddLineProject = (event) => {
    event.preventDefault()
    const name = newLineDraft.name.trim()
    if (!name) return
    const nextProjects = [
      ...projects,
      {
        id: `pb-proj-${Date.now()}`,
        name,
        code: newLineDraft.code.trim() || `PB-LINE-0${projects.length + 1}`,
        location: newLineDraft.location.trim() || meta.location || 'Harare',
        manager: meta.ceo || 'Plant Manager',
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        productFocus: newLineDraft.productFocus.trim() || formulas[0]?.name || '',
        summary: newLineDraft.summary.trim() || `${name} manufacturing production line.`,
      },
    ]
    persistMeta({ ...meta, projects: nextProjects })
    setNewLineDraft({ name: '', code: '', location: '', productFocus: '', summary: '' })
  }

  const activeFormula = formulas.find((f) => f.id === (selectedFormulaId || formulas[0]?.id)) || null

  return (
    <div className="tpl-shell tpl-prixburg">
      <header className="tpl-header">
        <div className="tpl-header-inner">
          <div className="tpl-header-left">
            <div className="tpl-menu-wrap">
              <button
                type="button"
                className="tpl-icon-btn"
                aria-label="Menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              {menuOpen && (
                <div className="tpl-dropdown">
                  <div className="tpl-dropdown-list">
                    <button
                      type="button"
                      className={view === 'home' ? 'tpl-dropdown-item active' : 'tpl-dropdown-item'}
                      onClick={() => {
                        setView('home')
                        setMenuOpen(false)
                      }}
                    >
                      <span>Home</span>
                    </button>
                    <button
                      type="button"
                      className={view === 'manufacturing-factory' ? 'tpl-dropdown-item active' : 'tpl-dropdown-item'}
                      onClick={() => {
                        setView('manufacturing-factory')
                        setMenuOpen(false)
                      }}
                    >
                      <span>Manufacturing factory</span>
                    </button>
                    <button
                      type="button"
                      className={view === 'sales-finance' ? 'tpl-dropdown-item active' : 'tpl-dropdown-item'}
                      onClick={() => {
                        setView('sales-finance')
                        setMenuOpen(false)
                      }}
                    >
                      <span>Sales and finance</span>
                    </button>
                    <button
                      type="button"
                      className={view === 'ceo-analysis' ? 'tpl-dropdown-item active' : 'tpl-dropdown-item'}
                      onClick={() => {
                        setView('ceo-analysis')
                        setMenuOpen(false)
                      }}
                    >
                      <span>CEO Analysis</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="tpl-brand-btn"
              onClick={() => {
                setView('home')
                setMenuOpen(false)
              }}
            >
              <span className="tpl-brand-f">F</span>
              <span className="tpl-brand-title">{brandName}</span>
            </button>
            <span className="tpl-subdomain-pill">{subdomain}</span>
          </div>

          <div className="tpl-header-actions">
            <button
              type="button"
              className="tpl-action-btn"
              onClick={() => {
                setMenuOpen(false)
                setView('ceo-analysis')
              }}
            >
              CEO Analysis
            </button>
            <button
              type="button"
              className="tpl-action-btn tpl-action-muted"
              onClick={() => {
                setMenuOpen(false)
                setView('settings')
              }}
            >
              Settings
            </button>
            {onBack && (
              <button type="button" className="tpl-action-btn tpl-back-fortress" onClick={onBack}>
                ← Fortress
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="tpl-main">
        {statusNote ? (
          <div className="tpl-container">
            <div className="tpl-notice-ok">
              <span>{statusNote}</span>
              <button type="button" className="tpl-close-x" onClick={() => setStatusNote('')}>×</button>
            </div>
          </div>
        ) : null}

        {view === 'home' && (
          <div className="tpl-container">
            <div className="tpl-hero-banner tpl-prixburg-banner">
              <div>
                <p className="tpl-eyebrow">Manufacturing Website Template · Prixburg Engine</p>
                <h1 className="tpl-prixburg-logo">
                  {brandName}
                  <sup className="tpl-tm">™</sup>
                </h1>
                <p className="tpl-hero-sub">
                  {meta.about ||
                    'Chemical & industrial manufacturing system: storeroom materials, batch formulas, finished stock, and CEO profit analysis.'}
                </p>
                <div className="tpl-meta-tags">
                  <span>Subdomain: <strong>{subdomain}</strong></span>
                  {meta.ceo ? <span>CEO: <strong>{meta.ceo}</strong></span> : null}
                  {meta.location ? <span>Location: <strong>{meta.location}</strong></span> : null}
                </div>
              </div>
              <div className="tpl-hero-btns">
                <button type="button" className="tpl-primary-btn" onClick={() => setView('manufacturing-factory')}>
                  Manufacturing Factory
                </button>
                <button type="button" className="tpl-secondary-btn" onClick={() => setView('sales-finance')}>
                  Sales & Finance
                </button>
                <button type="button" className="tpl-secondary-btn" onClick={() => setView('ceo-analysis')}>
                  CEO Analysis
                </button>
              </div>
            </div>

            <div className="tpl-hub-grid">
              <button type="button" className="tpl-hub-card" onClick={() => setView('manufacturing-factory')}>
                <span className="tpl-hub-icon">🏭</span>
                <div>
                  <h3>Manufacturing factory</h3>
                  <p>Raw materials storeroom, movement history, batch production report, and finished products.</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('sales-finance')}>
                <span className="tpl-hub-icon">💳</span>
                <div>
                  <h3>Sales and finance</h3>
                  <p>Sales analysis report, daily/monthly sales entry, profit & expense reports, and credit report.</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('ceo-analysis')}>
                <span className="tpl-hub-icon">📈</span>
                <div>
                  <h3>CEO Analysis</h3>
                  <p>CEO Net Profit (sales minus expenses) and CEO Gross Profit (expected sales minus raw material cost).</p>
                </div>
              </button>
            </div>

            <section className="tpl-section">
              <div className="tpl-section-head">
                <h2>Active Manufacturing Lines & Projects ({overviews.length})</h2>
                <p>Overview of every manufacturing project/line configured from CEO metadata.</p>
              </div>
              <div className="tpl-project-grid">
                {overviews.map((line) => (
                  <article key={line.id} className="tpl-project-card">
                    <div className="tpl-project-card-top">
                      <div>
                        <span className="tpl-code-badge">{line.code}</span>
                        <h3>{line.name}</h3>
                        <p className="tpl-muted-line">{line.location} · Product: {line.productFocus || 'All Products'}</p>
                      </div>
                      <span className="tpl-status-active">Running</span>
                    </div>
                    <p className="tpl-project-desc">{line.summary}</p>
                    <div className="tpl-kpi-strip">
                      <div>
                        <span>Produced Output</span>
                        <strong>{line.metrics.producedQty} L</strong>
                      </div>
                      <div>
                        <span>Finished In Stock</span>
                        <strong>{line.metrics.inStockQty} L ({money(line.metrics.inStockValue)})</strong>
                      </div>
                      <div>
                        <span>Expected Gross Profit</span>
                        <strong>{money(line.metrics.grossProfit)}</strong>
                      </div>
                      <div>
                        <span>Actual Sales</span>
                        <strong>{money(line.metrics.actualSales)}</strong>
                      </div>
                    </div>
                    <div className="tpl-card-footer">
                      <button type="button" className="tpl-primary-btn" onClick={() => setView('production-reports')}>
                        Production & Batch Entry
                      </button>
                      <button type="button" className="tpl-secondary-btn" onClick={() => setView('ceo-analysis')}>
                        CEO Profit Tables
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === 'manufacturing-factory' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
              ← Home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">{brandName} Factory Floor</p>
                <h1>Manufacturing factory</h1>
              </div>
            </header>

            <div className="tpl-hub-grid">
              <button type="button" className="tpl-hub-card" onClick={() => setView('raw-materials')}>
                <span className="tpl-hub-icon">🧪</span>
                <div>
                  <h3>Raw materials</h3>
                  <p>Store room inventory ({rawMaterials.length} items · {money(storeroomTotal)}) and movement history.</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('production-reports')}>
                <span className="tpl-hub-icon">⚗️</span>
                <div>
                  <h3>Production report</h3>
                  <p>Run detergent formula batches, scale raw materials automatically, and view daily/monthly production.</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('finished-products')}>
                <span className="tpl-hub-icon">🧴</span>
                <div>
                  <h3>Finished products</h3>
                  <p>Stock comes from production entry; matching sales entry quantities are subtracted automatically.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'raw-materials' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('manufacturing-factory')}>
              ← Manufacturing factory
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Raw Materials & Storeroom</p>
                <h1>Store Room & Movement History</h1>
              </div>
              <div className="tpl-head-pills">
                <span className="tpl-code-badge">Total Storeroom Value: {money(storeroomTotal)}</span>
              </div>
            </header>

            <div className="tpl-panel">
              <h3>Raw Materials Storeroom</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Material Name</th>
                      <th>Unit</th>
                      <th>Quantity in Store</th>
                      <th>Unit Cost</th>
                      <th>Total Cost</th>
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
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan="5">Grand Total Storeroom Inventory</th>
                      <th>{money(storeroomTotal)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddRawMaterial}>
                <h4>Add / Purchase Raw Material into Storeroom</h4>
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

            <div className="tpl-panel">
              <h3>Raw Material Movement History ({movements.length})</h3>
              <div className="tpl-batch-list">
                {movements.map((batch) => (
                  <article key={batch.id} className="tpl-batch-card">
                    <div className="tpl-batch-top">
                      <span className="tpl-code-badge">
                        {batch.type === 'purchase' ? 'Purchase' : 'Production Batch'}
                      </span>
                      <small>{new Date(batch.at).toLocaleString()}</small>
                    </div>
                    {batch.type === 'purchase' ? (
                      <p>
                        <strong>Purchased:</strong> +{batch.quantity} {batch.unit} {batch.material} ·{' '}
                        <strong>Available:</strong> {batch.remainingMaterial} {batch.unit}
                      </p>
                    ) : (
                      <>
                        <p>
                          <strong>Produced:</strong> {batch.productQty} {batch.productUnit} {batch.product} ·{' '}
                          <strong>Raw Material Cost:</strong> {money(batch.cost)}
                        </p>
                        <p className="tpl-muted-line">
                          <strong>Used:</strong>{' '}
                          {(batch.used || []).map((u) => `${u.name} (${u.amount} ${u.unit})`).join(' | ')}
                        </p>
                      </>
                    )}
                    {batch.remainingStock ? (
                      <p className="tpl-muted-line"><strong>Remaining stock:</strong> {batch.remainingStock}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'production-reports' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('manufacturing-factory')}>
              ← Manufacturing factory
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Production Entry & Reports</p>
                <h1>Production Report & Batch Scaling</h1>
                <p className="tpl-muted-line">
                  Produce a batch from a saved detergent formula. Ingredients scale automatically and deduct from the storeroom.
                </p>
              </div>
            </header>

            <div className="tpl-panel">
              <h3>Produce New Batch (Scales Formula & Deducts Storeroom Stock)</h3>
              <form className="tpl-inline-form" onSubmit={handleProduceBatch}>
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
                        {f.name} (Base formula: {f.production} {f.unit || 'L'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Batch quantity (L)"
                    value={produceDraft.quantity}
                    onChange={(e) => setProduceDraft({ ...produceDraft, quantity: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Produce Batch</button>
                </div>
              </form>
            </div>

            <div className="tpl-panel">
              <h3>Completed Production Runs</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Detergent / Product</th>
                      <th>Production Line</th>
                      <th>Quantity Produced</th>
                      <th>Raw Material Cost</th>
                      <th>Expected Sales Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((prod) => {
                      const expected = (Number(prod.quantity) || 0) * sellingPriceFor(prod.product)
                      return (
                        <tr key={prod.id}>
                          <td>{prod.date}</td>
                          <td><strong>{prod.product}</strong></td>
                          <td>{prod.lineProject || 'Main Plant'}</td>
                          <td>{prod.quantity} {prod.unit}</td>
                          <td>{money(prod.cost)}</td>
                          <td>{money(expected)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan="4">Totals</th>
                      <th>{money(totalRawMaterialProductionCost)}</th>
                      <th>{money(totalExpectedSales)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'finished-products' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('manufacturing-factory')}>
              ← Manufacturing factory
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Warehouse Stock</p>
                <h1>Finished products</h1>
                <p className="tpl-muted-line">
                  Stock comes from production entry. Matching sales entry quantities are subtracted automatically.
                </p>
              </div>
            </header>

            <div className="tpl-panel">
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Detergent name</th>
                      <th>Unit</th>
                      <th>Produced Total</th>
                      <th>Sold Total</th>
                      <th>Total detergent quantity in stock</th>
                      <th>Total detergent in stock $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedProducts.map((item) => (
                      <tr key={item.name}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.unit}</td>
                        <td>{item.produced} {item.unit}</td>
                        <td>{item.sold} {item.unit}</td>
                        <td><strong>{item.inStock} {item.unit}</strong></td>
                        <td><strong>{money(item.stockValue)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'sales-finance' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
              ← Home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Commercial & Accounting</p>
                <h1>Sales and finance</h1>
              </div>
            </header>

            <div className="tpl-kpi-strip tpl-kpi-4">
              <div>
                <span>Total Sales Revenue</span>
                <strong>{money(totalSalesRevenue)}</strong>
              </div>
              <div>
                <span>Cash Sales</span>
                <strong>{money(cashSalesRevenue)}</strong>
              </div>
              <div>
                <span>Outstanding Credit</span>
                <strong>{money(creditOutstanding)}</strong>
              </div>
              <div>
                <span>Net Profit</span>
                <strong className={totalNetProfit >= 0 ? 'tpl-text-ok' : 'tpl-text-danger'}>
                  {money(totalNetProfit)}
                </strong>
              </div>
            </div>

            <div className="tpl-panel">
              <h3>Sales Analysis & Sales Entry</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Team Leader</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td><strong>{row.item}</strong></td>
                        <td>{row.teamLeader}</td>
                        <td>{row.customer}</td>
                        <td>
                          <span className="tpl-code-badge">{row.saleType}</span>
                        </td>
                        <td>{row.quantity}</td>
                        <td>{money(row.unitPrice)}</td>
                        <td>{money((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddSale}>
                <h4>Record Sales Entry</h4>
                <div className="tpl-form-row">
                  <input
                    type="date"
                    value={saleDraft.date}
                    onChange={(e) => setSaleDraft({ ...saleDraft, date: e.target.value })}
                  />
                  <select
                    value={saleDraft.item || formulas[0]?.name || ''}
                    onChange={(e) => setSaleDraft({ ...saleDraft, item: e.target.value })}
                  >
                    {formulas.map((f) => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
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
                    <option value="cash">Cash Sale</option>
                    <option value="credit">Credit Sale</option>
                  </select>
                  <input
                    type="number"
                    step="1"
                    placeholder="Qty (L)"
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

            <div className="tpl-panel">
              <h3>Profit and Expense Reports (Daily Operating Expenses)</h3>
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
                      <th>Day Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => {
                      const daySum =
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
                          <td><strong>{money(daySum)}</strong></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddExpense}>
                <h4>Add Daily Operating Expense</h4>
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
          </div>
        )}

        {view === 'ceo-analysis' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
              ← Home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">{brandName} Executive Dashboard</p>
                <h1>CEO Analysis — Net Profit & Gross Profit</h1>
              </div>
            </header>

            <div className="tpl-panel">
              <h3>CEO Net Profit</h3>
              <p className="tpl-muted-line">
                Total sales come from sales entry. Net profit is total sales minus total expenses (raw material cost + operating expenses).
              </p>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Period / Production Line</th>
                      <th>Total sales</th>
                      <th>Total expenses</th>
                      <th>Net profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviews.map((line) => (
                      <tr key={line.id}>
                        <td><strong>{line.name}</strong> ({line.productFocus})</td>
                        <td>{money(line.metrics.actualSales)}</td>
                        <td>{money(line.metrics.totalExpenses)}</td>
                        <td className={line.metrics.netProfit >= 0 ? 'tpl-text-ok' : 'tpl-text-danger'}>
                          <strong>{money(line.metrics.netProfit)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Company Cumulative Total (Nov 2026)</th>
                      <th>{money(totalSalesRevenue)}</th>
                      <th>{money(totalCombinedExpenses)}</th>
                      <th>{money(totalNetProfit)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="tpl-panel">
              <h3>CEO Gross Profit</h3>
              <p className="tpl-muted-line">
                Expected sales come from production and pricing. Expected gross profit is expected sales minus the cost of raw materials.
              </p>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Period / Production Line</th>
                      <th>Expected sales</th>
                      <th>Cost of raw materials</th>
                      <th>Expected gross profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviews.map((line) => (
                      <tr key={line.id}>
                        <td><strong>{line.name}</strong> ({line.productFocus})</td>
                        <td>{money(line.metrics.expectedSales)}</td>
                        <td>{money(line.metrics.rawMaterialCost)}</td>
                        <td className="tpl-text-ok">
                          <strong>{money(line.metrics.grossProfit)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Company Cumulative Total (Nov 2026)</th>
                      <th>{money(totalExpectedSales)}</th>
                      <th>{money(totalRawMaterialProductionCost)}</th>
                      <th>{money(totalExpectedGrossProfit)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
              ← Home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Settings, Formulas, Pricing & CEO Metadata</p>
                <h1>{brandName} Settings</h1>
              </div>
            </header>

            <div className="tpl-panel">
              <h3>CEO & Factory Metadata</h3>
              <form
                className="tpl-settings-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  persistMeta(meta)
                  setStatusNote('CEO metadata saved and synced to Fortress platform.')
                }}
              >
                <div className="tpl-form-grid">
                  <label>
                    Company / Factory Name
                    <input
                      type="text"
                      value={meta.companyName || ''}
                      onChange={(e) =>
                        setMeta({ ...meta, companyName: e.target.value, brandName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    CEO Name
                    <input
                      type="text"
                      value={meta.ceo || ''}
                      onChange={(e) => setMeta({ ...meta, ceo: e.target.value })}
                    />
                  </label>
                  <label>
                    Location
                    <input
                      type="text"
                      value={meta.location || ''}
                      onChange={(e) => setMeta({ ...meta, location: e.target.value })}
                    />
                  </label>
                  <label>
                    Subdomain
                    <input type="text" value={subdomain} readOnly />
                  </label>
                </div>
                <label>
                  Factory Overview Description
                  <textarea
                    rows={2}
                    value={meta.about || ''}
                    onChange={(e) => setMeta({ ...meta, about: e.target.value })}
                  />
                </label>
                <button type="submit" className="tpl-primary-btn">Save Metadata</button>
              </form>
            </div>

            <div className="tpl-panel">
              <h3>Detergent & Chemical Formulas ({formulas.length})</h3>
              <div className="tpl-head-pills">
                {formulas.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={
                      (activeFormula?.id === f.id) ? 'tpl-primary-btn' : 'tpl-secondary-btn'
                    }
                    onClick={() => setSelectedFormulaId(f.id)}
                  >
                    {f.name} ({f.production} {f.unit || 'L'})
                  </button>
                ))}
              </div>

              {activeFormula && (
                <div style={{ marginTop: 14 }}>
                  <h4>
                    Formula: {activeFormula.name} — Yield: {activeFormula.production} {activeFormula.unit || 'L'}
                  </h4>
                  <div className="tpl-table-wrap">
                    <table className="tpl-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Unit</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total Cost</th>
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
                        placeholder="Ingredient name"
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
                        placeholder="Qty"
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
                <h4>Create New Product Formula</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Formula product name"
                    value={formulaDraft.name}
                    onChange={(e) => setFormulaDraft({ ...formulaDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Batch output yield (L)"
                    value={formulaDraft.production}
                    onChange={(e) => setFormulaDraft({ ...formulaDraft, production: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Create Formula</button>
                </div>
              </form>
            </div>

            <div className="tpl-panel">
              <h3>Product Selling Prices</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Unit</th>
                      <th>Pack Qty</th>
                      <th>Price</th>
                      <th>Unit Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.name}</strong></td>
                        <td>{row.unit}</td>
                        <td>{row.quantity}</td>
                        <td>{money(row.price)}</td>
                        <td>{money((Number(row.price) || 0) / (Number(row.quantity) || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddPricing}>
                <h4>Add Product Pricing</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Product name"
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
                  <button type="submit" className="tpl-primary-btn">Save Price</button>
                </div>
              </form>
            </div>

            <div className="tpl-panel">
              <h3>Add Manufacturing Production Line / Project</h3>
              <form className="tpl-inline-form" onSubmit={handleAddLineProject}>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Line / Project name"
                    value={newLineDraft.name}
                    onChange={(e) => setNewLineDraft({ ...newLineDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g. PB-LINE-04)"
                    value={newLineDraft.code}
                    onChange={(e) => setNewLineDraft({ ...newLineDraft, code: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Product focus"
                    value={newLineDraft.productFocus}
                    onChange={(e) => setNewLineDraft({ ...newLineDraft, productFocus: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Summary"
                    value={newLineDraft.summary}
                    onChange={(e) => setNewLineDraft({ ...newLineDraft, summary: e.target.value })}
                  />
                  <button type="submit" className="tpl-primary-btn">Add Production Line</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
