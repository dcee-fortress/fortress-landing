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

export default function RodcroftTemplate({
  site,
  initialProjectId = '',
  initialView = 'home',
  onBack,
  onMetadataUpdated,
}) {
  const [meta, setMeta] = useState(() => getSiteCeoMetadata(site))
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(
    () => initialProjectId || getSiteCeoMetadata(site).projects?.[0]?.id || '',
  )
  const [view, setView] = useState(() => (initialProjectId ? initialView || 'project-home' : initialView))
  const [statusNote, setStatusNote] = useState('')

  // New project form state
  const [newProjForm, setNewProjForm] = useState({
    name: '',
    code: '',
    location: '',
    client: '',
    manager: '',
    startDate: new Date().toISOString().slice(0, 10),
    summary: '',
    initialActivity: 'Site establishment & main structural works',
    initialTargetCost: '85000',
  })

  // Form states for adding BOQ, Material, Fuel, Worker, SHEQ
  const [boqDraft, setBoqDraft] = useState({
    description: '',
    unit: 'm2',
    quantity: '',
    rate: '',
    actualMeasuredWork: '',
    actualCostIncurred: '',
  })
  const [matDraft, setMatDraft] = useState({
    name: '',
    unit: 'bags',
    requested: '',
    received: '',
    used: '',
    unitCost: '',
  })
  const [fuelDraft, setFuelDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    plant: '',
    operator: '',
    liters: '',
    rate: '1.62',
  })
  const [workerDraft, setWorkerDraft] = useState({
    name: '',
    role: '',
    register: 'induction',
    plant: '',
    presentDays: '22',
  })
  const [sheqDraft, setSheqDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Weekly SHEQ Inspection',
    status: 'Compliant',
    highlight: '',
    incidents: '0',
  })

  useEffect(() => {
    const loaded = getSiteCeoMetadata(site)
    setMeta(loaded)
    if (initialProjectId) {
      setActiveProjectId(initialProjectId)
      setView(initialView === 'home' ? 'project-home' : initialView)
    } else if (!activeProjectId && loaded.projects?.[0]?.id) {
      setActiveProjectId(loaded.projects[0].id)
    }
  }, [site?.id, site?.slug, initialProjectId, initialView])

  useEffect(() => {
    const title = meta.brandName || meta.companyName || site?.name || 'Rodcroft'
    document.title = `${title} · Construction Platform`
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

  const projects = meta.projects || []
  const activeProjects = projects.filter((p) => p.status !== 'ended')
  const endedProjects = projects.filter((p) => p.status === 'ended')
  const currentProject =
    projects.find((p) => p.id === activeProjectId) || activeProjects[0] || projects[0] || null

  const overviews = useMemo(() => computeSiteProjectsOverview(meta), [meta])
  const currentOverview = overviews.find((o) => o.id === currentProject?.id) || overviews[0] || null

  const updateCurrentProject = (updater) => {
    if (!currentProject) return
    const nextProjects = projects.map((p) => (p.id === currentProject.id ? updater(p) : p))
    persistMeta({ ...meta, projects: nextProjects })
  }

  const handleCreateProject = (event) => {
    event.preventDefault()
    const name = newProjForm.name.trim()
    if (!name) return
    const targetCost = Number(newProjForm.initialTargetCost) || 0
    const created = {
      id: `p-${Date.now()}`,
      name,
      code: newProjForm.code.trim() || `RC-${projects.length + 1}`,
      location: newProjForm.location.trim() || meta.location || 'Zimbabwe',
      client: newProjForm.client.trim() || 'Client',
      manager: newProjForm.manager.trim() || meta.ceo || 'Site Engineer',
      status: 'active',
      startDate: newProjForm.startDate || new Date().toISOString().slice(0, 10),
      endDate: null,
      summary:
        newProjForm.summary.trim() ||
        `General construction and site works for ${name}.`,
      boqItems: targetCost > 0
        ? [
            {
              id: `boq-${Date.now()}`,
              description: newProjForm.initialActivity.trim() || 'Main construction works',
              unit: 'sum',
              quantity: 1,
              rate: targetCost,
              targetCost,
              actualMeasuredWork: 0,
              actualCostIncurred: 0,
            },
          ]
        : [],
      materials: [],
      fuel: {
        bulkTankCapacityLiters: 5000,
        bulkInsertedLiters: 2000,
        ratePerLiter: 1.62,
        entries: [],
      },
      workers: [
        {
          id: `w-${Date.now()}`,
          name: newProjForm.manager.trim() || meta.ceo || 'Site Agent',
          role: 'Site Agent / Engineer',
          register: 'admin',
          presentDays: 1,
        },
      ],
      ppe: [],
      sheqReports: [],
    }
    const nextProjects = [created, ...projects]
    persistMeta({ ...meta, projects: nextProjects })
    setActiveProjectId(created.id)
    setShowNewProjectModal(false)
    setView('project-home')
    setNewProjForm({
      name: '',
      code: '',
      location: '',
      client: '',
      manager: '',
      startDate: new Date().toISOString().slice(0, 10),
      summary: '',
      initialActivity: 'Site establishment & main structural works',
      initialTargetCost: '85000',
    })
  }

  const handleAddBoqItem = (event) => {
    event.preventDefault()
    const desc = boqDraft.description.trim()
    if (!desc) return
    const qty = Number(boqDraft.quantity) || 1
    const rate = Number(boqDraft.rate) || 0
    const targetCost = qty * rate
    const measured = Number(boqDraft.actualMeasuredWork) || 0
    const actual = Number(boqDraft.actualCostIncurred) || 0
    updateCurrentProject((proj) => ({
      ...proj,
      boqItems: [
        ...(proj.boqItems || []),
        {
          id: `boq-${Date.now()}`,
          description: desc,
          unit: boqDraft.unit || 'm2',
          quantity: qty,
          rate,
          targetCost,
          actualMeasuredWork: measured,
          actualCostIncurred: actual,
        },
      ],
    }))
    setBoqDraft({
      description: '',
      unit: 'm2',
      quantity: '',
      rate: '',
      actualMeasuredWork: '',
      actualCostIncurred: '',
    })
  }

  const handleAddMaterial = (event) => {
    event.preventDefault()
    const name = matDraft.name.trim()
    if (!name) return
    updateCurrentProject((proj) => ({
      ...proj,
      materials: [
        ...(proj.materials || []),
        {
          id: `mat-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          name,
          unit: matDraft.unit || 'bags',
          requested: Number(matDraft.requested) || 0,
          received: Number(matDraft.received) || 0,
          used: Number(matDraft.used) || 0,
          unitCost: Number(matDraft.unitCost) || 0,
        },
      ],
    }))
    setMatDraft({ name: '', unit: 'bags', requested: '', received: '', used: '', unitCost: '' })
  }

  const handleAddFuelEntry = (event) => {
    event.preventDefault()
    const plant = fuelDraft.plant.trim()
    const liters = Number(fuelDraft.liters) || 0
    if (!plant || !(liters > 0)) return
    updateCurrentProject((proj) => ({
      ...proj,
      fuel: {
        ...(proj.fuel || { bulkTankCapacityLiters: 5000, bulkInsertedLiters: 2000, ratePerLiter: 1.62 }),
        entries: [
          {
            id: `fuel-${Date.now()}`,
            date: fuelDraft.date || new Date().toISOString().slice(0, 10),
            plant,
            operator: fuelDraft.operator.trim() || 'Operator',
            liters,
            rate: Number(fuelDraft.rate) || 1.62,
          },
          ...(proj.fuel?.entries || []),
        ],
      },
    }))
    setFuelDraft({
      date: new Date().toISOString().slice(0, 10),
      plant: '',
      operator: '',
      liters: '',
      rate: '1.62',
    })
  }

  const handleAddWorker = (event) => {
    event.preventDefault()
    const name = workerDraft.name.trim()
    if (!name) return
    updateCurrentProject((proj) => ({
      ...proj,
      workers: [
        ...(proj.workers || []),
        {
          id: `w-${Date.now()}`,
          name,
          role: workerDraft.role.trim() || 'Site Worker',
          register: workerDraft.register || 'induction',
          plant: workerDraft.plant.trim(),
          presentDays: Number(workerDraft.presentDays) || 1,
        },
      ],
    }))
    setWorkerDraft({ name: '', role: '', register: 'induction', plant: '', presentDays: '22' })
  }

  const handleAddSheqReport = (event) => {
    event.preventDefault()
    const highlight = sheqDraft.highlight.trim()
    if (!highlight) return
    updateCurrentProject((proj) => ({
      ...proj,
      sheqReports: [
        {
          id: `sheq-${Date.now()}`,
          date: sheqDraft.date || new Date().toISOString().slice(0, 10),
          type: sheqDraft.type || 'Weekly SHEQ Inspection',
          status: sheqDraft.status || 'Compliant',
          highlight,
          incidents: Number(sheqDraft.incidents) || 0,
        },
        ...(proj.sheqReports || []),
      ],
    }))
    setSheqDraft({
      date: new Date().toISOString().slice(0, 10),
      type: 'Weekly SHEQ Inspection',
      status: 'Compliant',
      highlight: '',
      incidents: '0',
    })
  }

  const brandName = meta.brandName || meta.companyName || site?.name || 'Rodcroft'
  const subdomain = subdomainLabelFor(meta)

  return (
    <div className="tpl-shell tpl-rodcroft">
      <header className="tpl-header">
        <div className="tpl-header-inner">
          <div className="tpl-header-left">
            <div className="tpl-menu-wrap">
              <button
                type="button"
                className="tpl-icon-btn"
                aria-label="Open projects menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              {menuOpen && (
                <div className="tpl-dropdown">
                  <div className="tpl-dropdown-head">
                    <span className="tpl-kicker">Projects</span>
                    <p>Select a project to open dashboards</p>
                  </div>
                  <div className="tpl-dropdown-list">
                    <button
                      type="button"
                      className={view === 'home' ? 'tpl-dropdown-item active' : 'tpl-dropdown-item'}
                      onClick={() => {
                        setView('home')
                        setMenuOpen(false)
                      }}
                    >
                      <span>{brandName} Home</span>
                      <small>Overview</small>
                    </button>
                    {activeProjects.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        className={
                          currentProject?.id === proj.id && view !== 'home'
                            ? 'tpl-dropdown-item active'
                            : 'tpl-dropdown-item'
                        }
                        onClick={() => {
                          setActiveProjectId(proj.id)
                          setView('project-home')
                          setMenuOpen(false)
                        }}
                      >
                        <span>{proj.name}</span>
                        {currentProject?.id === proj.id ? <small className="tpl-badge-open">Open</small> : null}
                      </button>
                    ))}
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
                setShowNewProjectModal(true)
              }}
            >
              <span>+ New project</span>
            </button>
            <button
              type="button"
              className="tpl-action-btn tpl-action-muted"
              onClick={() => {
                setMenuOpen(false)
                setView('settings')
              }}
            >
              <span>Settings</span>
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
        {view === 'home' && (
          <div className="tpl-container">
            <div className="tpl-hero-banner">
              <div>
                <p className="tpl-eyebrow">Construction Website Template · Rodcroft Engine</p>
                <h1 className="tpl-wordmark-hero">{brandName}</h1>
                <p className="tpl-hero-sub">
                  {meta.about || 'Construction earned-value reporting, QS schedules, plant registers, and SHEQ dashboards.'}
                </p>
                <div className="tpl-meta-tags">
                  <span>Subdomain: <strong>{subdomain}</strong></span>
                  {meta.ceo ? <span>CEO: <strong>{meta.ceo}</strong></span> : null}
                  {meta.location ? <span>Location: <strong>{meta.location}</strong></span> : null}
                </div>
              </div>
              <div className="tpl-hero-btns">
                <button
                  type="button"
                  className="tpl-primary-btn"
                  onClick={() => setShowNewProjectModal(true)}
                >
                  + New Project
                </button>
                <button
                  type="button"
                  className="tpl-secondary-btn"
                  onClick={() => setView('settings')}
                >
                  Configure CEO Metadata
                </button>
              </div>
            </div>

            <section className="tpl-section">
              <div className="tpl-section-head">
                <h2>Active Construction Projects ({activeProjects.length})</h2>
                <p>Select any project to open Engineering (CEO Exclusive), Quantity Survey, or Safety & Health.</p>
              </div>

              <div className="tpl-project-grid">
                {overviews
                  .filter((item) => item.status !== 'ended')
                  .map((item) => (
                    <article key={item.id} className="tpl-project-card">
                      <div className="tpl-project-card-top">
                        <div>
                          <span className="tpl-code-badge">{item.code}</span>
                          <h3>{item.name}</h3>
                          <p className="tpl-muted-line">{item.location} · Lead: {item.manager}</p>
                        </div>
                        <span className="tpl-status-active">Active</span>
                      </div>
                      <p className="tpl-project-desc">{item.summary}</p>
                      <div className="tpl-kpi-strip">
                        <div>
                          <span>Target Budget</span>
                          <strong>{money(item.metrics.targetCost)}</strong>
                        </div>
                        <div>
                          <span>Work Valued</span>
                          <strong>{money(item.metrics.measuredWork)} ({item.metrics.progressPct}%)</strong>
                        </div>
                        <div>
                          <span>Workers on Site</span>
                          <strong>{item.metrics.workersOnSite}</strong>
                        </div>
                        <div>
                          <span>Fuel Consumed</span>
                          <strong>{item.metrics.fuelConsumedLiters} L</strong>
                        </div>
                      </div>
                      <div className="tpl-card-footer">
                        <button
                          type="button"
                          className="tpl-primary-btn"
                          onClick={() => {
                            setActiveProjectId(item.id)
                            setView('project-home')
                          }}
                        >
                          Open Project Hub
                        </button>
                        <button
                          type="button"
                          className="tpl-secondary-btn"
                          onClick={() => {
                            setActiveProjectId(item.id)
                            setView('ceo-dashboards')
                          }}
                        >
                          CEO Engineering Overview
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          </div>
        )}

        {currentProject && view === 'project-home' && (
          <div className="tpl-container">
            <div className="tpl-breadcrumb-bar">
              <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
                ← All {brandName} Projects
              </button>
              <span className="tpl-code-badge">{currentProject.code || 'SITE'}</span>
            </div>

            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">{currentProject.location} · Started {currentProject.startDate}</p>
                <h1>{currentProject.name}</h1>
                <p className="tpl-muted-line">{currentProject.summary}</p>
              </div>
            </header>

            <div className="tpl-hub-grid">
              <button
                type="button"
                className="tpl-hub-card"
                onClick={() => setView('ceo-dashboards')}
              >
                <span className="tpl-hub-icon">📊</span>
                <div>
                  <h3>Engineering (CEO Overview)</h3>
                  <p>Executive overview: Total work valued, total workers on site, materials overview, and fuel consumed to date.</p>
                </div>
              </button>

              <button
                type="button"
                className="tpl-hub-card"
                onClick={() => setView('qs-engineering')}
              >
                <span className="tpl-hub-icon">📐</span>
                <div>
                  <h3>Quantity Survey</h3>
                  <p>BOQ Valuations, Material Schedule, Fuel Schedule, Plant on Site, and Rate Analysis.</p>
                </div>
              </button>

              <button
                type="button"
                className="tpl-hub-card"
                onClick={() => setView('safety-health')}
              >
                <span className="tpl-hub-icon">🛡️</span>
                <div>
                  <h3>Safety & Health (SHEQ)</h3>
                  <p>Site Staff attendance, Induction & Plant registers, PPE received/issued, and SHEQ inspection reports.</p>
                </div>
              </button>
            </div>

            {currentOverview && (
              <section className="tpl-panel">
                <h3>Main Activity & Cumulative Project Snapshot</h3>
                <div className="tpl-kpi-strip tpl-kpi-4">
                  <div>
                    <span>Target Cost (BOQ)</span>
                    <strong>{money(currentOverview.metrics.targetCost)}</strong>
                  </div>
                  <div>
                    <span>Actual Measured Work</span>
                    <strong>{money(currentOverview.metrics.measuredWork)}</strong>
                  </div>
                  <div>
                    <span>Actual Cost Incurred</span>
                    <strong>{money(currentOverview.metrics.actualCost)}</strong>
                  </div>
                  <div>
                    <span>Cost Variance</span>
                    <strong className={currentOverview.metrics.variance > 0 ? 'tpl-text-danger' : 'tpl-text-ok'}>
                      {money(currentOverview.metrics.variance)}
                    </strong>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {currentProject && view === 'ceo-dashboards' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('project-home')}>
              ← Back to project home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Engineering · Executive Overview</p>
                <h1>{currentProject.name}</h1>
                <p className="tpl-muted-line">Executive overview of project performance across valuations, workers, materials, and fuel.</p>
              </div>
            </header>

            <div className="tpl-hub-grid tpl-hub-2">
              <button type="button" className="tpl-hub-card" onClick={() => setView('work-valued')}>
                <span className="tpl-hub-icon">🏗️</span>
                <div>
                  <h3>Total work valued</h3>
                  <p>Project to date activities, BOQ cost, measured production and rate ({money(currentOverview?.metrics.measuredWork)})</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('workers')}>
                <span className="tpl-hub-icon">👷</span>
                <div>
                  <h3>Total number of workers</h3>
                  <p>Workers on site ({currentOverview?.metrics.workersOnSite}), admin members ({currentOverview?.metrics.adminCount}) and registers</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('materials-overview')}>
                <span className="tpl-hub-icon">📦</span>
                <div>
                  <h3>Materials overview</h3>
                  <p>Material analysis and project to date material on site ({money(currentOverview?.metrics.materialValueOnSite)} in stock)</p>
                </div>
              </button>

              <button type="button" className="tpl-hub-card" onClick={() => setView('fuel-consumed')}>
                <span className="tpl-hub-icon">⛽</span>
                <div>
                  <h3>Fuel consumed to date</h3>
                  <p>Project to date fuel consumed ({currentOverview?.metrics.fuelConsumedLiters} L · {money(currentOverview?.metrics.fuelConsumedCost)})</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {currentProject && (view === 'work-valued' || view === 'qs-engineering') && (
          <div className="tpl-container">
            <button
              type="button"
              className="tpl-link-back"
              onClick={() => setView(view === 'qs-engineering' ? 'project-home' : 'ceo-dashboards')}
            >
              ← Back
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Quantity Survey & Valuations</p>
                <h1>{currentProject.name} — Project to Date Valuations</h1>
                <p className="tpl-muted-line">Earned value report comparing target BOQ cost, actual measured work, and actual cost incurred.</p>
              </div>
              <div className="tpl-head-pills">
                <button type="button" className="tpl-secondary-btn" onClick={() => setView('materials-overview')}>
                  Material Schedule
                </button>
                <button type="button" className="tpl-secondary-btn" onClick={() => setView('fuel-consumed')}>
                  Fuel Schedule
                </button>
              </div>
            </header>

            <div className="tpl-panel">
              <h3>Earned Value & BOQ Schedule</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Activity Description</th>
                      <th>Unit</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Target Cost</th>
                      <th>Measured Work</th>
                      <th>Actual Cost</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentProject.boqItems || []).map((item) => {
                      const variance = (Number(item.actualCostIncurred) || 0) - (Number(item.actualMeasuredWork) || 0)
                      return (
                        <tr key={item.id}>
                          <td><strong>{item.description}</strong></td>
                          <td>{item.unit}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.rate)}</td>
                          <td>{money(item.targetCost)}</td>
                          <td>
                            <input
                              type="number"
                              className="tpl-inline-input"
                              value={item.actualMeasuredWork}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                updateCurrentProject((proj) => ({
                                  ...proj,
                                  boqItems: proj.boqItems.map((b) =>
                                    b.id === item.id ? { ...b, actualMeasuredWork: val } : b,
                                  ),
                                }))
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="tpl-inline-input"
                              value={item.actualCostIncurred}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                updateCurrentProject((proj) => ({
                                  ...proj,
                                  boqItems: proj.boqItems.map((b) =>
                                    b.id === item.id ? { ...b, actualCostIncurred: val } : b,
                                  ),
                                }))
                              }}
                            />
                          </td>
                          <td className={variance > 0 ? 'tpl-text-danger' : 'tpl-text-ok'}>
                            {money(variance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan="4">Project to Date Totals</th>
                      <th>{money(currentOverview?.metrics.targetCost)}</th>
                      <th>{money(currentOverview?.metrics.measuredWork)}</th>
                      <th>{money(currentOverview?.metrics.actualCost)}</th>
                      <th>{money(currentOverview?.metrics.variance)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddBoqItem}>
                <h4>Add BOQ Valuation Activity</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Activity description"
                    value={boqDraft.description}
                    onChange={(e) => setBoqDraft({ ...boqDraft, description: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Unit (m2, m3, sum)"
                    value={boqDraft.unit}
                    onChange={(e) => setBoqDraft({ ...boqDraft, unit: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={boqDraft.quantity}
                    onChange={(e) => setBoqDraft({ ...boqDraft, quantity: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate ($)"
                    value={boqDraft.rate}
                    onChange={(e) => setBoqDraft({ ...boqDraft, rate: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Measured ($)"
                    value={boqDraft.actualMeasuredWork}
                    onChange={(e) => setBoqDraft({ ...boqDraft, actualMeasuredWork: e.target.value })}
                  />
                  <button type="submit" className="tpl-primary-btn">Add Activity</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentProject && view === 'workers' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('ceo-dashboards')}>
              ← Back to Engineering
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Total Number of Workers</p>
                <h1>{currentProject.name}</h1>
                <p className="tpl-muted-line">
                  People on site this month from the induction, site staff, and operator registers.
                </p>
              </div>
            </header>

            <div className="tpl-kpi-strip tpl-kpi-3">
              <div>
                <span>Total workers on site</span>
                <strong>{currentOverview?.metrics.workersOnSite}</strong>
              </div>
              <div>
                <span>Total admin members</span>
                <strong>{currentOverview?.metrics.adminCount}</strong>
              </div>
              <div>
                <span>Plant operators</span>
                <strong>{currentOverview?.metrics.operatorCount}</strong>
              </div>
            </div>

            <div className="tpl-panel">
              <h3>Site Staff, Induction & Plant Operator Registers</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Role / Designation</th>
                      <th>Register</th>
                      <th>Assigned Plant</th>
                      <th>Days Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentProject.workers || []).map((w) => (
                      <tr key={w.id}>
                        <td><strong>{w.name}</strong></td>
                        <td>{w.role}</td>
                        <td><span className="tpl-code-badge">{w.register}</span></td>
                        <td>{w.plant || '—'}</td>
                        <td>{w.presentDays || 0} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddWorker}>
                <h4>Register Worker / Staff Member</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={workerDraft.name}
                    onChange={(e) => setWorkerDraft({ ...workerDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Role / Position"
                    value={workerDraft.role}
                    onChange={(e) => setWorkerDraft({ ...workerDraft, role: e.target.value })}
                    required
                  />
                  <select
                    value={workerDraft.register}
                    onChange={(e) => setWorkerDraft({ ...workerDraft, register: e.target.value })}
                  >
                    <option value="induction">Induction Register</option>
                    <option value="admin">Site Staff (Admin)</option>
                    <option value="operators">Plant Operator</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Assigned Plant (optional)"
                    value={workerDraft.plant}
                    onChange={(e) => setWorkerDraft({ ...workerDraft, plant: e.target.value })}
                  />
                  <button type="submit" className="tpl-primary-btn">Add to Register</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentProject && view === 'materials-overview' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('ceo-dashboards')}>
              ← Back to Engineering
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Materials Overview & Storeroom Schedule</p>
                <h1>{currentProject.name}</h1>
                <p className="tpl-muted-line">
                  Material analysis (requested, received, balance to deliver) and project-to-date material on site.
                </p>
              </div>
            </header>

            <div className="tpl-kpi-strip tpl-kpi-3">
              <div>
                <span>Storeroom Stock lines</span>
                <strong>{(currentProject.materials || []).length}</strong>
              </div>
              <div>
                <span>Consumed Material Value</span>
                <strong>{money(currentOverview?.metrics.materialConsumedValue)}</strong>
              </div>
              <div>
                <span>On-Site Balance Value</span>
                <strong>{money(currentOverview?.metrics.materialValueOnSite)}</strong>
              </div>
            </div>

            <div className="tpl-panel">
              <h3>Project to Date Material Analysis & Storeroom Stock</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Material Description</th>
                      <th>Unit</th>
                      <th>Bulk Requested</th>
                      <th>Received on Site</th>
                      <th>Used / Issued</th>
                      <th>Left in Storeroom</th>
                      <th>Unit Cost</th>
                      <th>Stock Value Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentProject.materials || []).map((mat) => {
                      const left = Math.max(0, (Number(mat.received) || 0) - (Number(mat.used) || 0))
                      const stockVal = left * (Number(mat.unitCost) || 0)
                      return (
                        <tr key={mat.id}>
                          <td><strong>{mat.name}</strong></td>
                          <td>{mat.unit}</td>
                          <td>{mat.requested}</td>
                          <td>
                            <input
                              type="number"
                              className="tpl-inline-input"
                              value={mat.received}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                updateCurrentProject((proj) => ({
                                  ...proj,
                                  materials: proj.materials.map((m) =>
                                    m.id === mat.id ? { ...m, received: val } : m,
                                  ),
                                }))
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="tpl-inline-input"
                              value={mat.used}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                updateCurrentProject((proj) => ({
                                  ...proj,
                                  materials: proj.materials.map((m) =>
                                    m.id === mat.id ? { ...m, used: val } : m,
                                  ),
                                }))
                              }}
                            />
                          </td>
                          <td><strong>{left} {mat.unit}</strong></td>
                          <td>{money(mat.unitCost)}</td>
                          <td>{money(stockVal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddMaterial}>
                <h4>Record Material Schedule Item</h4>
                <div className="tpl-form-row">
                  <input
                    type="text"
                    placeholder="Material name"
                    value={matDraft.name}
                    onChange={(e) => setMatDraft({ ...matDraft, name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Unit (bags, m3, tons)"
                    value={matDraft.unit}
                    onChange={(e) => setMatDraft({ ...matDraft, unit: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Requested"
                    value={matDraft.requested}
                    onChange={(e) => setMatDraft({ ...matDraft, requested: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Received"
                    value={matDraft.received}
                    onChange={(e) => setMatDraft({ ...matDraft, received: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Used"
                    value={matDraft.used}
                    onChange={(e) => setMatDraft({ ...matDraft, used: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Cost ($)"
                    value={matDraft.unitCost}
                    onChange={(e) => setMatDraft({ ...matDraft, unitCost: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Save Material</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentProject && view === 'fuel-consumed' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('ceo-dashboards')}>
              ← Back to Engineering
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Fuel Schedule · Project to Date</p>
                <h1>{currentProject.name} — Fuel Consumed to Date</h1>
                <p className="tpl-muted-line">
                  Daily plant fuel consumed against bulk diesel inserted in the site tank.
                </p>
              </div>
            </header>

            <div className="tpl-kpi-strip tpl-kpi-4">
              <div>
                <span>Bulk Fuel Inserted in Tank</span>
                <strong>{currentProject.fuel?.bulkInsertedLiters || 0} L</strong>
              </div>
              <div>
                <span>Fuel Consumed to Date</span>
                <strong>{currentOverview?.metrics.fuelConsumedLiters} L</strong>
              </div>
              <div>
                <span>Current Bulk Fuel Left</span>
                <strong>{currentOverview?.metrics.fuelRemainingLiters} L</strong>
              </div>
              <div>
                <span>Total Fuel Cost</span>
                <strong>{money(currentOverview?.metrics.fuelConsumedCost)}</strong>
              </div>
            </div>

            <div className="tpl-panel">
              <h3>Daily Plant Fuel Consumption Log</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plant / Equipment</th>
                      <th>Operator</th>
                      <th>Liters Consumed</th>
                      <th>Rate / L</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentProject.fuel?.entries || []).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td><strong>{entry.plant}</strong></td>
                        <td>{entry.operator}</td>
                        <td>{entry.liters} L</td>
                        <td>{money(entry.rate)}</td>
                        <td>{money((Number(entry.liters) || 0) * (Number(entry.rate) || 1.62))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddFuelEntry}>
                <h4>Record Daily Fuel Consumed</h4>
                <div className="tpl-form-row">
                  <input
                    type="date"
                    value={fuelDraft.date}
                    onChange={(e) => setFuelDraft({ ...fuelDraft, date: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Plant / Machine name"
                    value={fuelDraft.plant}
                    onChange={(e) => setFuelDraft({ ...fuelDraft, plant: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Operator name"
                    value={fuelDraft.operator}
                    onChange={(e) => setFuelDraft({ ...fuelDraft, operator: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Liters"
                    value={fuelDraft.liters}
                    onChange={(e) => setFuelDraft({ ...fuelDraft, liters: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Log Fuel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentProject && view === 'safety-health' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('project-home')}>
              ← Back to project home
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Safety, Health, Environment & Quality (SHEQ)</p>
                <h1>{currentProject.name} — SHEQ & PPE</h1>
                <p className="tpl-muted-line">
                  Site inspections, incident reports, PPE received/issued, and attendance registers.
                </p>
              </div>
              <button type="button" className="tpl-secondary-btn" onClick={() => setView('workers')}>
                Open Attendance Registers
              </button>
            </header>

            <div className="tpl-panel">
              <h3>SHEQ Inspection & Weekly Progress Reports</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Report Type</th>
                      <th>Status</th>
                      <th>Major Highlight / Inspection Findings</th>
                      <th>Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentProject.sheqReports || []).map((rep) => (
                      <tr key={rep.id}>
                        <td>{rep.date}</td>
                        <td><strong>{rep.type}</strong></td>
                        <td><span className="tpl-status-active">{rep.status}</span></td>
                        <td>{rep.highlight}</td>
                        <td>{rep.incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="tpl-inline-form" onSubmit={handleAddSheqReport}>
                <h4>Log SHEQ Site Inspection / Weekly Report</h4>
                <div className="tpl-form-row">
                  <input
                    type="date"
                    value={sheqDraft.date}
                    onChange={(e) => setSheqDraft({ ...sheqDraft, date: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Report type"
                    value={sheqDraft.type}
                    onChange={(e) => setSheqDraft({ ...sheqDraft, type: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Major highlight / inspection notes"
                    value={sheqDraft.highlight}
                    onChange={(e) => setSheqDraft({ ...sheqDraft, highlight: e.target.value })}
                    required
                  />
                  <button type="submit" className="tpl-primary-btn">Save SHEQ Report</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="tpl-container">
            <button type="button" className="tpl-link-back" onClick={() => setView('home')}>
              ← Back to {brandName}
            </button>
            <header className="tpl-page-head">
              <div>
                <p className="tpl-eyebrow">Settings & CEO Metadata Configuration</p>
                <h1>{brandName} Settings</h1>
                <p className="tpl-muted-line">
                  Update CEO metadata, manage construction projects, and configure subdomain settings for {subdomain}.
                </p>
              </div>
            </header>

            {statusNote ? <p className="tpl-notice-ok">{statusNote}</p> : null}

            <div className="tpl-panel">
              <h3>CEO & Company Metadata</h3>
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
                    Company / Brand Name
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
                  Company Description
                  <textarea
                    rows={3}
                    value={meta.about || ''}
                    onChange={(e) => setMeta({ ...meta, about: e.target.value })}
                  />
                </label>
                <button type="submit" className="tpl-primary-btn">Save Metadata</button>
              </form>
            </div>

            <div className="tpl-panel">
              <h3>Manage Projects ({projects.length})</h3>
              <div className="tpl-table-wrap">
                <table className="tpl-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Project Name</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((proj) => (
                      <tr key={proj.id}>
                        <td>{proj.code}</td>
                        <td><strong>{proj.name}</strong></td>
                        <td>{proj.location}</td>
                        <td>{proj.status === 'ended' ? 'Ended' : 'Active'}</td>
                        <td>
                          <div className="tpl-row-btns">
                            <button
                              type="button"
                              className="tpl-secondary-btn"
                              onClick={() => {
                                setActiveProjectId(proj.id)
                                setView('project-home')
                              }}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="tpl-secondary-btn"
                              onClick={() => {
                                const next = projects.map((p) =>
                                  p.id === proj.id
                                    ? { ...p, status: p.status === 'ended' ? 'active' : 'ended' }
                                    : p,
                                )
                                persistMeta({ ...meta, projects: next })
                              }}
                            >
                              {proj.status === 'ended' ? 'Reactivate' : 'End Project'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {endedProjects.length > 0 ? (
                <p className="tpl-muted-line">{endedProjects.length} ended project(s) archived.</p>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {showNewProjectModal && (
        <div className="tpl-modal-backdrop" onClick={() => setShowNewProjectModal(false)}>
          <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tpl-modal-head">
              <h3>Create New Construction Project</h3>
              <button type="button" className="tpl-close-x" onClick={() => setShowNewProjectModal(false)}>
                ×
              </button>
            </div>
            <form className="tpl-settings-form" onSubmit={handleCreateProject}>
              <label>
                Project Name
                <input
                  type="text"
                  placeholder="e.g. Victoria Falls Airport Runway Rehabilitation"
                  value={newProjForm.name}
                  onChange={(e) => setNewProjForm({ ...newProjForm, name: e.target.value })}
                  required
                />
              </label>
              <div className="tpl-form-grid">
                <label>
                  Project Code
                  <input
                    type="text"
                    placeholder="e.g. RC-VFA-03"
                    value={newProjForm.code}
                    onChange={(e) => setNewProjForm({ ...newProjForm, code: e.target.value })}
                  />
                </label>
                <label>
                  Site Location
                  <input
                    type="text"
                    placeholder="e.g. Victoria Falls"
                    value={newProjForm.location}
                    onChange={(e) => setNewProjForm({ ...newProjForm, location: e.target.value })}
                  />
                </label>
                <label>
                  Client
                  <input
                    type="text"
                    placeholder="Client organization"
                    value={newProjForm.client}
                    onChange={(e) => setNewProjForm({ ...newProjForm, client: e.target.value })}
                  />
                </label>
                <label>
                  Start Date
                  <input
                    type="date"
                    value={newProjForm.startDate}
                    onChange={(e) => setNewProjForm({ ...newProjForm, startDate: e.target.value })}
                  />
                </label>
                <label>
                  Initial BOQ Activity
                  <input
                    type="text"
                    value={newProjForm.initialActivity}
                    onChange={(e) => setNewProjForm({ ...newProjForm, initialActivity: e.target.value })}
                  />
                </label>
                <label>
                  Initial Target Budget ($)
                  <input
                    type="number"
                    value={newProjForm.initialTargetCost}
                    onChange={(e) => setNewProjForm({ ...newProjForm, initialTargetCost: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Scope Summary
                <textarea
                  rows={2}
                  placeholder="Brief description of site works"
                  value={newProjForm.summary}
                  onChange={(e) => setNewProjForm({ ...newProjForm, summary: e.target.value })}
                />
              </label>
              <div className="tpl-modal-actions">
                <button
                  type="button"
                  className="tpl-secondary-btn"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tpl-primary-btn">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
