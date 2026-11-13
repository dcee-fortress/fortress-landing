import { useEffect, useMemo, useState } from 'react'
import {
  cleanSlug,
  computePrixburgCeoAnalysis,
  computeSiteProjectsOverview,
  getSiteCeoMetadata,
  subdomainLabelFor,
} from './fortressMetadata'
import { fetchLiveChadcombeOverview } from './liveChadcombe'
import { storage } from './storage'

const FAB_PROJECTS_KEY = 'fortress-fab-projects-v1'

const loadRecentFabProjects = () => {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(storage.getItem(FAB_PROJECTS_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const money = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const rateMoney = (value) => {
  if (value === null || value === undefined || !(Number(value) > 0)) return '—'
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
}

const numFmt = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

function CommandBar({ sites, targetSite, onSelectSite, onViewWebsite }) {
  const index = sites.findIndex((site) => site.id === targetSite?.id)
  const nextSite = sites.length > 1 ? sites[(index + 1) % sites.length] : null

  return (
    <div className="ceo-command-bar">
      <button type="button" className="primary-button" onClick={() => onViewWebsite?.(targetSite)}>
        View My Website
      </button>
      {nextSite ? (
        <button type="button" className="tpl-secondary-btn" onClick={() => onSelectSite?.(nextSite)}>
          Switch app · {nextSite.name}
        </button>
      ) : null}
    </div>
  )
}

export default function CeoProjectsOverview({
  sites = [],
  activeSite = null,
  onSelectSite,
  onViewWebsite,
  onOpenProject,
}) {
  const [tick, setTick] = useState(0)
  // Sub-view for Prixburg CEO Analysis: 'menu' | 'net-profit' | 'gross-profit'
  const [prixburgSubView, setPrixburgSubView] = useState('menu')
  // Sub-view for Rodcroft Engineering: 'menu' | 'work-valued' | 'material-analysis' | 'material-on-site' | 'fuel-analysis' | 'workers'
  const [rodcroftSubView, setRodcroftSubView] = useState('menu')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [valSearch, setValSearch] = useState('')
  const [fuelDetailCostMode, setFuelDetailCostMode] = useState(false)
  const [liveChadcombe, setLiveChadcombe] = useState(null)
  const [liveStatus, setLiveStatus] = useState('idle')

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1)
    window.addEventListener('fortress-ceo-metadata-change', refresh)
    return () => window.removeEventListener('fortress-ceo-metadata-change', refresh)
  }, [])

  const targetSite = activeSite || sites[0] || null
  const siteMeta = useMemo(() => {
    void tick
    return targetSite ? getSiteCeoMetadata(targetSite) : null
  }, [targetSite, tick])

  const siteSlug = cleanSlug(
    String(targetSite?.slug || targetSite?.catalogId || targetSite?.name || '').replace(/^site-/, ''),
  )

  useEffect(() => {
    setPrixburgSubView('menu')
    setRodcroftSubView('menu')
    setSelectedProjectId('')
  }, [targetSite?.id, targetSite?.slug])

  useEffect(() => {
    if (siteSlug !== 'rodcroft') {
      setLiveChadcombe(null)
      setLiveStatus('idle')
      return undefined
    }
    let cancelled = false
    setLiveStatus('loading')
    fetchLiveChadcombeOverview()
      .then((overview) => {
        if (cancelled) return
        setLiveChadcombe(overview)
        setLiveStatus(overview?.valuations?.length ? 'ready' : 'error')
      })
      .catch(() => {
        if (!cancelled) setLiveStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [siteSlug])

  if (!targetSite) {
    return (
      <div className="ceo-overview-empty">
        <p className="empty-note">Buy a CEO website to open the live tenant dashboard here.</p>
      </div>
    )
  }

  if (targetSite.systemType === 'fabrication') {
    const recentProjects = loadRecentFabProjects()
    return (
      <div className="ceo-overview-panel">
        <CommandBar
          sites={sites}
          targetSite={targetSite}
          onSelectSite={onSelectSite}
          onViewWebsite={onViewWebsite}
        />
        <div className="ceo-overview-header-card">
          <div>
            <p className="rc-eyebrow">Recent projects</p>
            <h4>{targetSite.name}</h4>
            <p className="shop-copy">
              Open a saved project here. View My Website shows {subdomainLabelFor(targetSite)} the way the workshop uses it.
            </p>
          </div>
        </div>
        <div className="pb-panel">
          <h3>Recent projects</h3>
          {recentProjects.length ? (
            <div className="fab-recent">
              {recentProjects.map((item) => (
                <button key={item.id} type="button" onClick={() => onOpenProject?.(item)}>
                  <strong>{item.name || 'Project'}</strong>
                  <small>{item.client || 'No client yet'}</small>
                  <span>{money(item.quoteTotal)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-note">No projects yet. Use View My Website to create the first one.</p>
          )}
        </div>
      </div>
    )
  }

  const isManufacturing =
    targetSite.systemType === 'manufacturing' || siteMeta?.template === 'prixburg'
  const subdomain = subdomainLabelFor(targetSite)

  // ============================================================================
  // 1) PRIXBURG / MANUFACTURING TENANT: Exact CEO Analysis Page
  // ============================================================================
  if (isManufacturing) {
    const ceoAnalysis = computePrixburgCeoAnalysis(siteMeta)

    return (
      <div className="ceo-overview-panel">
        <CommandBar
          sites={sites}
          targetSite={targetSite}
          onSelectSite={onSelectSite}
          onViewWebsite={onViewWebsite}
        />

        <div className="ceo-overview-header-card">
          <div>
            <p className="rc-eyebrow">CEO Analysis</p>
            <h4>{siteMeta?.companyName || targetSite.name}</h4>
            <p className="shop-copy">
              Command center for {subdomain}. CEO Gross Profit and CEO Net Profit open here.
            </p>
          </div>
        </div>

        {/* Exact Prixburg CEO Analysis Panel */}
        {prixburgSubView === 'menu' && (
          <div className="pb-panel">
            <h3>CEO Analysis</h3>
            <div className="pb-choice-grid">
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setPrixburgSubView('gross-profit')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3h6" />
                  <path d="M10 3v7.5L5.2 18.2A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.8L14 10.5V3" />
                  <path d="M8.5 14h7" />
                </svg>
                CEO Gross Profit
              </button>
              <button
                type="button"
                className="pb-choice-btn"
                onClick={() => setPrixburgSubView('net-profit')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
                CEO Net Profit
              </button>
            </div>
          </div>
        )}

        {/* CEO Gross Profit View */}
        {prixburgSubView === 'gross-profit' && (
          <div className="pb-panel">
            <button
              type="button"
              className="rc-back-link"
              onClick={() => setPrixburgSubView('menu')}
            >
              ← Back to CEO Analysis
            </button>

            <div className="pb-sales-cards" style={{ marginTop: 10 }}>
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
        )}

        {/* CEO Net Profit View */}
        {prixburgSubView === 'net-profit' && (
          <div className="pb-panel">
            <button
              type="button"
              className="rc-back-link"
              onClick={() => setPrixburgSubView('menu')}
            >
              ← Back to CEO Analysis
            </button>

            <div className="pb-sales-cards" style={{ marginTop: 10 }}>
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
        )}
      </div>
    )
  }

  // ============================================================================
  // 2) RODCROFT / CONSTRUCTION TENANT: Exact Live Engineering Dashboard
  // ============================================================================
  const projects =
    liveStatus === 'ready' && liveChadcombe
      ? [liveChadcombe]
      : computeSiteProjectsOverview(targetSite)
  const activeProj =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null

  const filteredVals = (activeProj?.valuations || []).filter((r) =>
    !valSearch.trim()
      ? true
      : String(r.description || '').toLowerCase().includes(valSearch.trim().toLowerCase()),
  )

  const fuelAnalysisRows = (() => {
    const entries = activeProj?.fuel?.entries || []
    const bulkTotalLiters = Number(activeProj?.fuel?.bulkInsertedLiters) || 0
    const bulkTotalCost = Number(activeProj?.fuel?.bulkInsertedCost) || 0
    const map = new Map()
    entries.forEach((e) => {
      const key = String(e.description || 'Diesel').trim().toLowerCase()
      const cur = map.get(key) || {
        id: key,
        description: e.description || 'Diesel',
        unit: e.unit || 'L',
        consumedQty: 0,
        consumedCost: 0,
      }
      cur.consumedQty = Math.round((cur.consumedQty + (Number(e.quantity || e.liters) || 0)) * 100) / 100
      cur.consumedCost = Math.round((cur.consumedCost + (Number(e.totalCost) || 0)) * 100) / 100
      map.set(key, cur)
    })
    return [...map.values()].map((row) => {
      const isDiesel = row.id === 'diesel'
      const bulkInsertedQty = isDiesel ? bulkTotalLiters : 0
      const bulkInsertedCost = isDiesel ? bulkTotalCost : 0
      return {
        ...row,
        bulkInsertedQty,
        bulkInsertedCost,
        fuelLeftQty: Math.round((row.consumedQty - bulkInsertedQty) * 100) / 100,
        fuelLeftCost: Math.round((row.consumedCost - bulkInsertedCost) * 100) / 100,
      }
    })
  })()

  return (
    <div className="ceo-overview-panel">
      <CommandBar
        sites={sites}
        targetSite={targetSite}
        onSelectSite={onSelectSite}
        onViewWebsite={onViewWebsite}
      />

      <div className="ceo-overview-header-card">
        <div>
          <p className="rc-eyebrow">Cumulative Dashboard</p>
            <h4>{siteSlug === 'rodcroft' ? 'Rodcroft' : siteMeta?.companyName || targetSite.name} — Engineering</h4>
          <p className="shop-copy">
            Command center for {subdomain}. The engineering page stays here, and each button opens its report.
            {siteSlug === 'rodcroft' && liveStatus === 'loading'
              ? ' Loading Chadcombe from rodcroft.fortress.vercel.app…'
              : ''}
            {siteSlug === 'rodcroft' && liveStatus === 'ready'
              ? ' Showing live Chadcombe data from rodcroft.fortress.vercel.app.'
              : ''}
          </p>
        </div>
      </div>

      {projects.length > 1 && (
        <div className="ceo-site-pills">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === activeProj?.id ? 'ceo-site-pill active' : 'ceo-site-pill'}
              onClick={() => {
                setSelectedProjectId(p.id)
                setRodcroftSubView('menu')
              }}
            >
              <strong>{p.name}</strong>
              <small>{money(p.metrics.totalWorkValued)}</small>
            </button>
          ))}
        </div>
      )}

      {!activeProj ? (
        <div className="pb-panel">
          <p className="rc-sub">
            No projects on {subdomain} yet. Use View My Website to create the first project the way the site does.
          </p>
        </div>
      ) : (
        <>
          {/* Engineering Main Menu (Interactive Buttons for Cumulative Valuations, Material Analysis, Fuel Analysis, Workers) */}
          {rodcroftSubView === 'menu' && (
            <div className="pb-panel">
              <p className="rc-eyebrow">Engineering</p>
              <h3 style={{ fontSize: '1.35rem', marginBottom: 4 }}>
                {siteSlug === 'rodcroft' ? 'Chadcombe' : activeProj.name}
              </h3>
              <p className="rc-sub" style={{ marginBottom: 14 }}>
                Executive overview of project performance.
              </p>

              <div className="rc-choice-grid">
                <button
                  type="button"
                  className="rc-choice-card"
                  onClick={() => setRodcroftSubView('work-valued')}
                >
                  <span className="rc-icon-tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
                      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
                      <path d="M4 15v-3a6 6 0 0 1 6-6h0" />
                      <path d="M14 6h0a6 6 0 0 1 6 6v3" />
                    </svg>
                  </span>
                  <div>
                    <h2>Cumulative Valuations (Total work valued)</h2>
                    <p>
                      Project to date activities, cost ({money(activeProj.metrics.totalWorkValued)}), production and rate
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="rc-choice-card"
                  onClick={() => setRodcroftSubView('material-analysis')}
                >
                  <span className="rc-icon-tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16.5 9.4 7.55 4.24" />
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.29 7 12 12 20.71 7" />
                      <line x1="12" y1="22" x2="12" y2="12" />
                    </svg>
                  </span>
                  <div>
                    <h2>Material Analysis</h2>
                    <p>
                      Read-only project to date of material requested, received ({activeProj.metrics.materialLines} items), and balance left
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="rc-choice-card"
                  onClick={() => setRodcroftSubView('fuel-analysis')}
                >
                  <span className="rc-icon-tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="22" x2="15" y2="22" />
                      <line x1="4" y1="9" x2="14" y2="9" />
                      <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
                      <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
                    </svg>
                  </span>
                  <div>
                    <h2>Fuel Analysis</h2>
                    <p>
                      Fuel consumed ({numFmt(activeProj.metrics.fuelConsumedLiters)} L · {money(activeProj.metrics.fuelConsumedCost)}), bulk tank &amp; fuel left
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="rc-choice-card"
                  onClick={() => setRodcroftSubView('workers')}
                >
                  <span className="rc-icon-tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <div>
                    <h2>Total number of workers (Admin &amp; Site Registers)</h2>
                    <p>
                      Workers on site ({activeProj.metrics.workersOnSite}), admin members ({activeProj.metrics.adminCount}) and registers
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 1) Cumulative Valuations / Total Work Valued */}
          {rodcroftSubView === 'work-valued' && (
            <div className="pb-panel">
              <button
                type="button"
                className="rc-back-link"
                onClick={() => setRodcroftSubView('menu')}
              >
                ← Back to Engineering
              </button>
              <p className="rc-eyebrow" style={{ marginTop: 8 }}>Project to Date Report</p>
              <h3>{activeProj.name} — Cumulative Valuations</h3>
              <p className="rc-sub" style={{ marginBottom: 12 }}>
                Total Actual Cost on Site: <strong>{money(activeProj.metrics.totalWorkValued)}</strong>
              </p>

              <input
                type="search"
                className="rc-search-input"
                placeholder="Search activity description…"
                value={valSearch}
                onChange={(e) => setValSearch(e.target.value)}
              />

              <div className="tpl-table-wrap">
                <table className="rc-ev-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Actual Cost on Site</th>
                      <th className="text-right">Production</th>
                      <th className="text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVals.map((row) => {
                      const rate =
                        Number(row.production) > 0
                          ? Number(row.valueEarned) / Number(row.production)
                          : null
                      return (
                        <tr key={row.id}>
                          <td><strong>{row.description}</strong></td>
                          <td className="text-right">{money(row.valueEarned)}</td>
                          <td className="text-right">{numFmt(row.production)}</td>
                          <td className="text-right">{rateMoney(rate)}</td>
                        </tr>
                      )
                    })}
                    <tr className="rc-ev-total-row">
                      <td>Total</td>
                      <td className="text-right">{money(activeProj.metrics.totalWorkValued)}</td>
                      <td className="text-right">{numFmt(activeProj.metrics.totalProduction)}</td>
                      <td className="text-right">{rateMoney(activeProj.metrics.overallRate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2) Material Analysis & Project to Date Material on Site */}
          {rodcroftSubView === 'material-analysis' && (
            <div className="pb-panel">
              <button
                type="button"
                className="rc-back-link"
                onClick={() => setRodcroftSubView('menu')}
              >
                ← Back to Engineering
              </button>
              <p className="rc-eyebrow" style={{ marginTop: 8 }}>Material analysis</p>
              <h3>{activeProj.name}</h3>
              <p className="rc-sub" style={{ marginBottom: 12 }}>
                Read-only project to date. Balance of material left is bulk material requested minus cumulative material received.
              </p>

              <div className="tpl-head-pills" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="tpl-primary-btn"
                  onClick={() => setRodcroftSubView('material-analysis')}
                >
                  Material analysis
                </button>
                <button
                  type="button"
                  className="tpl-secondary-btn"
                  onClick={() => setRodcroftSubView('material-on-site')}
                >
                  Project to date material on site
                </button>
              </div>

              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Bulk material requested</th>
                      <th className="text-right">Cumulative material received</th>
                      <th className="text-right">Balance of material left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeProj.materialAnalysis || []).map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.description}</strong></td>
                        <td className="text-right">{numFmt(row.requestedQuantity)}</td>
                        <td className="text-right">{numFmt(row.receivedQuantity)}</td>
                        <td className="text-right">
                          <strong>{numFmt(row.materialLeft)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rodcroftSubView === 'material-on-site' && (
            <div className="pb-panel">
              <button
                type="button"
                className="rc-back-link"
                onClick={() => setRodcroftSubView('material-analysis')}
              >
                ← Back to Material analysis
              </button>
              <p className="rc-eyebrow" style={{ marginTop: 8 }}>Project to date material on site</p>
              <h3>{activeProj.name}</h3>
              <p className="rc-sub" style={{ marginBottom: 12 }}>
                Storeroom quantities brought on site, material used, and material left for the whole project.
              </p>

              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Material brought on site</th>
                      <th className="text-right">Material used</th>
                      <th className="text-right">Material left on site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeProj.materialAnalysis || []).map((row) => {
                      const brought = Number(row.broughtOnSite ?? row.receivedQuantity) || 0
                      const used = Number(row.materialUsed) || 0
                      const left = Number(row.onSiteLeft ?? brought - used) || 0
                      return (
                        <tr key={row.id}>
                          <td><strong>{row.description}</strong></td>
                          <td className="text-right">{numFmt(brought)}</td>
                          <td className="text-right">{numFmt(used)}</td>
                          <td className="text-right">
                            <strong>{numFmt(left)}</strong>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3) Fuel Analysis */}
          {rodcroftSubView === 'fuel-analysis' && (
            <div className="pb-panel">
              <button
                type="button"
                className="rc-back-link"
                onClick={() => setRodcroftSubView('menu')}
              >
                ← Back to Engineering
              </button>
              <p className="rc-eyebrow" style={{ marginTop: 8 }}>Fuel analysis</p>
              <h3>{activeProj.name}</h3>
              <p className="rc-sub" style={{ marginBottom: 12 }}>
                Read-only project to date. Each fuel name is one line. Fuel left in tank is fuel consumed minus bulk fuel inserted in tank.
              </p>

              <div className="rc-headcount-grid" style={{ marginTop: 10 }}>
                <div className="rc-headcount-card">
                  <p className="rc-eyebrow">Bulk Fuel Inserted in Tank</p>
                  <strong className="rc-headcount-num">{numFmt(activeProj.metrics.bulkFuelLiters)} L</strong>
                  <p className="rc-sub">{money(activeProj.metrics.bulkFuelCost)}</p>
                </div>
                <div className="rc-headcount-card">
                  <p className="rc-eyebrow">Total Fuel Consumed to Date</p>
                  <strong className="rc-headcount-num">{numFmt(activeProj.metrics.fuelConsumedLiters)} L</strong>
                  <p className="rc-sub">{money(activeProj.metrics.fuelConsumedCost)}</p>
                </div>
              </div>

              <div className="tpl-head-pills" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className={!fuelDetailCostMode ? 'tpl-primary-btn' : 'tpl-secondary-btn'}
                  onClick={() => setFuelDetailCostMode(false)}
                >
                  Fuel left in tank (Liters)
                </button>
                <button
                  type="button"
                  className={fuelDetailCostMode ? 'tpl-primary-btn' : 'tpl-secondary-btn'}
                  onClick={() => setFuelDetailCostMode(true)}
                >
                  Details (Fuel Costs $)
                </button>
              </div>

              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    {!fuelDetailCostMode ? (
                      <tr>
                        <th>Description</th>
                        <th className="text-right">Fuel consumed</th>
                        <th className="text-right">Bulk fuel inserted in tank</th>
                        <th className="text-right">Fuel left in tank</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Description</th>
                        <th className="text-right">Fuel consumed cost</th>
                        <th className="text-right">Bulk fuel inserted in tank cost</th>
                        <th className="text-right">Fuel left in tank cost</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {fuelAnalysisRows.map((row) =>
                      !fuelDetailCostMode ? (
                        <tr key={row.id}>
                          <td><strong>{row.description}</strong></td>
                          <td className="text-right">{numFmt(row.consumedQty)}</td>
                          <td className="text-right">{numFmt(row.bulkInsertedQty)}</td>
                          <td className="text-right">
                            <strong>{numFmt(row.fuelLeftQty)}</strong>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id}>
                          <td><strong>{row.description}</strong></td>
                          <td className="text-right">{money(row.consumedCost)}</td>
                          <td className="text-right">{money(row.bulkInsertedCost)}</td>
                          <td className="text-right">
                            <strong>{money(row.fuelLeftCost)}</strong>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4) Total Number of Workers */}
          {rodcroftSubView === 'workers' && (
            <div className="pb-panel">
              <button
                type="button"
                className="rc-back-link"
                onClick={() => setRodcroftSubView('menu')}
              >
                ← Back to Engineering
              </button>
              <p className="rc-eyebrow" style={{ marginTop: 8 }}>Total number of workers</p>
              <h3>{activeProj.name}</h3>

              <div className="rc-headcount-grid" style={{ marginTop: 10 }}>
                <div className="rc-headcount-card">
                  <p className="rc-eyebrow">Total workers on site</p>
                  <strong className="rc-headcount-num">{activeProj.metrics.workersOnSite}</strong>
                  <p className="rc-sub">
                    {activeProj.metrics.inductionCount} induction + {activeProj.metrics.adminCount} admin + {activeProj.metrics.operatorCount} operators
                  </p>
                </div>
                <div className="rc-headcount-card">
                  <p className="rc-eyebrow">Total admin members</p>
                  <strong className="rc-headcount-num">{activeProj.metrics.adminCount}</strong>
                  <p className="rc-sub">Site Staff register</p>
                </div>
              </div>

              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role / Position</th>
                      <th>Register</th>
                      <th>Plant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeProj.workers || []).map((w) => (
                      <tr key={w.id}>
                        <td><strong>{w.name}</strong></td>
                        <td>{w.role}</td>
                        <td>
                          <span className="tpl-code-badge">{w.register}</span>
                        </td>
                        <td>{w.plant || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
