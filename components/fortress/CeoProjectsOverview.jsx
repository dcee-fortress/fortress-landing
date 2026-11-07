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

export default function CeoProjectsOverview({
  sites = [],
  activeSite = null,
  onSelectSite,
  onOpenGeneratedApp,
  onOpenCalc,
}) {
  const [tick, setTick] = useState(0)
  const [showAddProject, setShowAddProject] = useState(false)
  const [projDraft, setProjDraft] = useState({
    name: '',
    code: '',
    location: '',
    budgetOrProduct: '',
    summary: '',
  })

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

  const allSiteOverviews = useMemo(() => {
    void tick
    return sites.map((s) => ({
      site: s,
      meta: getSiteCeoMetadata(s),
      projects: computeSiteProjectsOverview(s),
    }))
  }, [sites, tick])

  if (!targetSite) {
    return (
      <div className="ceo-overview-empty">
        <p className="empty-note">Buy or configure a CEO website to see the overview of every project here.</p>
      </div>
    )
  }

  if (targetSite.systemType === 'fabrication') {
    return (
      <div className="ceo-embedded">
        <div className="ceo-overview-header-card">
          <div>
            <span className="tpl-code-badge">Fabrication Calculator</span>
            <h4>{targetSite.name}</h4>
            <p className="shop-copy">{subdomainLabelFor(targetSite)}</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onOpenCalc?.(targetSite)}>
            Open Calculator
          </button>
        </div>
      </div>
    )
  }

  const isManufacturing =
    targetSite.systemType === 'manufacturing' || siteMeta?.template === 'prixburg'
  const projects = computeSiteProjectsOverview(targetSite)

  const handleQuickAddProject = (event) => {
    event.preventDefault()
    const name = projDraft.name.trim()
    if (!name || !siteMeta) return

    if (isManufacturing) {
      const nextProjects = [
        ...(siteMeta.projects || []),
        {
          id: `pb-proj-${Date.now()}`,
          name,
          code: projDraft.code.trim() || `PB-LINE-0${(siteMeta.projects?.length || 0) + 1}`,
          location: projDraft.location.trim() || siteMeta.location || 'Zimbabwe',
          manager: siteMeta.ceo || 'Plant Manager',
          status: 'active',
          startDate: new Date().toISOString().slice(0, 10),
          productFocus: projDraft.budgetOrProduct.trim() || siteMeta.detergentFormulas?.[0]?.name || 'Detergent',
          summary: projDraft.summary.trim() || `${name} manufacturing line configured by CEO.`,
        },
      ]
      saveSiteCeoMetadata(targetSite, { ...siteMeta, projects: nextProjects })
    } else {
      const budget = Number(projDraft.budgetOrProduct) || 65000
      const nextProjects = [
        {
          id: `p-${Date.now()}`,
          name,
          code: projDraft.code.trim() || `RC-0${(siteMeta.projects?.length || 0) + 1}`,
          location: projDraft.location.trim() || siteMeta.location || 'Zimbabwe',
          client: 'Client',
          manager: siteMeta.ceo || 'Site Engineer',
          status: 'active',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: null,
          summary: projDraft.summary.trim() || `Construction and site works for ${name}.`,
          boqItems: [
            {
              id: `boq-${Date.now()}`,
              description: 'Main civil & structural works',
              unit: 'sum',
              quantity: 1,
              rate: budget,
              targetCost: budget,
              actualMeasuredWork: 0,
              actualCostIncurred: 0,
            },
          ],
          materials: [],
          fuel: { bulkTankCapacityLiters: 5000, bulkInsertedLiters: 2000, ratePerLiter: 1.62, entries: [] },
          workers: [
            {
              id: `w-${Date.now()}`,
              name: siteMeta.ceo || 'Site Engineer',
              role: 'Site Agent',
              register: 'admin',
              presentDays: 1,
            },
          ],
          ppe: [],
          sheqReports: [],
        },
        ...(siteMeta.projects || []),
      ]
      saveSiteCeoMetadata(targetSite, { ...siteMeta, projects: nextProjects })
    }

    setProjDraft({ name: '', code: '', location: '', budgetOrProduct: '', summary: '' })
    setShowAddProject(false)
    setTick((t) => t + 1)
  }

  return (
    <div className="ceo-overview-panel">
      {sites.length > 1 && (
        <div className="ceo-site-pills">
          {allSiteOverviews.map(({ site, projects: siteProjs }) => (
            <button
              key={site.id}
              type="button"
              className={site.id === targetSite.id ? 'ceo-site-pill active' : 'ceo-site-pill'}
              onClick={() => onSelectSite?.(site)}
            >
              <strong>{site.name}</strong>
              <small>
                {site.systemType === 'manufacturing' ? 'Prixburg' : 'Rodcroft'} · {siteProjs.length} project
                {siteProjs.length === 1 ? '' : 's'}
              </small>
            </button>
          ))}
        </div>
      )}

      <div className="ceo-overview-header-card">
        <div>
          <span className="tpl-code-badge">
            {isManufacturing ? 'Prixburg Manufacturing Template' : 'Rodcroft Construction Template'}
          </span>
          <h4>{siteMeta?.companyName || targetSite.name} — All Projects Overview</h4>
          <p className="shop-copy">
            Subdomain: <strong>{subdomainLabelFor(targetSite)}</strong>
            {siteMeta?.ceo ? ` · CEO: ${siteMeta.ceo}` : ''}
          </p>
        </div>
        <div className="ceo-overview-top-btns">
          <button
            type="button"
            className="primary-button"
            onClick={() => onOpenGeneratedApp?.(targetSite, '', 'home')}
          >
            Open {subdomainLabelFor(targetSite)}
          </button>
          <button
            type="button"
            className="tpl-secondary-btn"
            onClick={() => setShowAddProject((v) => !v)}
          >
            {showAddProject ? 'Cancel' : '+ Add Project'}
          </button>
        </div>
      </div>

      {showAddProject && (
        <form className="ceo-quick-project-form" onSubmit={handleQuickAddProject}>
          <h5>Add New Project via CEO Metadata</h5>
          <input
            type="text"
            placeholder={isManufacturing ? 'Production line / project name' : 'Construction project name'}
            value={projDraft.name}
            onChange={(e) => setProjDraft({ ...projDraft, name: e.target.value })}
            required
          />
          <div className="ceo-quick-row">
            <input
              type="text"
              placeholder="Project code (optional)"
              value={projDraft.code}
              onChange={(e) => setProjDraft({ ...projDraft, code: e.target.value })}
            />
            <input
              type="text"
              placeholder="Location"
              value={projDraft.location}
              onChange={(e) => setProjDraft({ ...projDraft, location: e.target.value })}
            />
          </div>
          <input
            type={isManufacturing ? 'text' : 'number'}
            placeholder={isManufacturing ? 'Product focus (e.g. Dishwashing Liquid)' : 'Target BOQ Budget ($)'}
            value={projDraft.budgetOrProduct}
            onChange={(e) => setProjDraft({ ...projDraft, budgetOrProduct: e.target.value })}
          />
          <input
            type="text"
            placeholder="Brief project summary"
            value={projDraft.summary}
            onChange={(e) => setProjDraft({ ...projDraft, summary: e.target.value })}
          />
          <button type="submit" className="primary-button">
            Save Project to {subdomainLabelFor(targetSite)}
          </button>
        </form>
      )}

      <div className="ceo-projects-list">
        {projects.map((proj) => (
          <article key={proj.id} className="ceo-project-overview-card">
            <div className="ceo-project-overview-head">
              <div>
                <span className="tpl-code-badge">{proj.code}</span>
                <h5>{proj.name}</h5>
                <small>
                  {proj.location} · Lead: {proj.manager}
                </small>
              </div>
              <span className="tpl-status-active">{proj.status === 'ended' ? 'Ended' : 'Active'}</span>
            </div>

            {proj.summary ? <p className="ceo-project-summary">{proj.summary}</p> : null}

            {!isManufacturing ? (
              <div className="ceo-metrics-grid">
                <div>
                  <span>Work Valued</span>
                  <strong>
                    {money(proj.metrics.measuredWork)} ({proj.metrics.progressPct}%)
                  </strong>
                </div>
                <div>
                  <span>Target Budget</span>
                  <strong>{money(proj.metrics.targetCost)}</strong>
                </div>
                <div>
                  <span>Workers on Site</span>
                  <strong>
                    {proj.metrics.workersOnSite} ({proj.metrics.adminCount} admin)
                  </strong>
                </div>
                <div>
                  <span>Materials on Site</span>
                  <strong>{money(proj.metrics.materialValueOnSite)}</strong>
                </div>
                <div>
                  <span>Fuel Consumed</span>
                  <strong>
                    {proj.metrics.fuelConsumedLiters} L ({money(proj.metrics.fuelConsumedCost)})
                  </strong>
                </div>
                <div>
                  <span>SHEQ Reports</span>
                  <strong>{proj.metrics.sheqReports} compliant</strong>
                </div>
              </div>
            ) : (
              <div className="ceo-metrics-grid">
                <div>
                  <span>Produced Output</span>
                  <strong>{proj.metrics.producedQty} L</strong>
                </div>
                <div>
                  <span>In Stock</span>
                  <strong>
                    {proj.metrics.inStockQty} L ({money(proj.metrics.inStockValue)})
                  </strong>
                </div>
                <div>
                  <span>Actual Sales</span>
                  <strong>{money(proj.metrics.actualSales)}</strong>
                </div>
                <div>
                  <span>Expected Gross Profit</span>
                  <strong>{money(proj.metrics.grossProfit)}</strong>
                </div>
                <div>
                  <span>Net Profit</span>
                  <strong>{money(proj.metrics.netProfit)}</strong>
                </div>
                <div>
                  <span>Storeroom Stock</span>
                  <strong>{money(proj.metrics.totalStoreroomValue)}</strong>
                </div>
              </div>
            )}

            <div className="ceo-project-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  onOpenGeneratedApp?.(
                    targetSite,
                    proj.id,
                    isManufacturing ? 'ceo-analysis' : 'ceo-dashboards',
                  )
                }
              >
                Open Project Overview
              </button>
              <button
                type="button"
                className="tpl-secondary-btn"
                onClick={() =>
                  onOpenGeneratedApp?.(
                    targetSite,
                    proj.id,
                    isManufacturing ? 'manufacturing-factory' : 'project-home',
                  )
                }
              >
                Open Full Workspace
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
