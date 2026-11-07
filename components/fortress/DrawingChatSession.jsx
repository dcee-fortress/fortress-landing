import { useEffect, useMemo, useRef, useState } from 'react'
import DrawingChatBar from './DrawingChatBar'
import DrawingExplainPane from './DrawingExplainPane'
import EditableMaterialTable from './EditableMaterialTable'
import BoqSummary from './BoqSummary'
import {
  buildDrawingExplanation,
  createEmptyDrawingSession,
  deriveSessionViews,
  formatCostSummary,
  formatLengthsSummary,
  formatTotalsSummary,
  formatWeightProductsSummary,
  formatWeightScheduleSummary,
  getNextPhase,
  isNextCommand,
  linesFromSchedule,
  pricingPatchFromUnitPrices,
  rememberQtyFormula,
  syncScheduleFromLines,
  usesWeightPath,
} from './drawingSession'
import { safeEvalFormula } from './gateSession'
import { extractSteelSchedule } from './steelVision'

const makeMsg = (role, text) => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  text,
  at: Date.now(),
})

const isPdfDrawing = (project = {}) => {
  const kind = String(project.drawingKind || '').toLowerCase()
  if (kind.includes('pdf')) return true
  const src = String(project.drawing || '')
  return src.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(project.drawingName || '')
}

export default function DrawingChatSession({
  project,
  pricing,
  online,
  onUpdateProject,
  onApplyExtraction,
  onPersistPricing,
  onSaveQuote,
  onNeedOnline,
  onOpenDrawing,
  onGuardUpload,
  onConsumeFreeUpload,
  onRequireSubscription,
  canUploadDrawing = true,
  freeDrawsLeft = 0,
  subscriptionActive = false,
  freemiumNote = '',
  jobTypeLabel,
}) {
  const fileRef = useRef(null)
  const [session, setSession] = useState(() => {
    const base = createEmptyDrawingSession()
    const withPercents =
      pricing?.transportPercent != null && pricing.transportPercent !== ''
        ? {
            ...base,
            labourPercent: String(pricing.labourPercent ?? base.labourPercent),
            consumablesPercent: String(pricing.consumablesPercent ?? base.consumablesPercent),
            transportPercent: String(pricing.transportPercent),
          }
        : base
    // Resume an already-read drawing (e.g. opened from recent projects).
    if (project?.drawing && project?.jobType) {
      const lines = linesFromSchedule(project.schedule || [], project.jobType, project.gate)
      return {
        ...withPercents,
        phase: 'explain',
        lines,
        messages: [
          makeMsg(
            'assistant',
            buildDrawingExplanation(project) +
              '\n\nType next to continue the take-off, or send a correction.',
          ),
        ],
      }
    }
    return withPercents
  })
  const views = useMemo(
    () => deriveSessionViews(session, project, pricing),
    [session, project, pricing],
  )

  // Keep chat bar visible above soft keyboards on mobile.
  useEffect(() => {
    document.documentElement.style.setProperty('--drawing-chat-pad', '0px')
  }, [])

  const patchSession = (patch) => setSession((prev) => ({ ...prev, ...patch }))

  const pushMessages = (...msgs) =>
    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, ...msgs],
    }))

  const refreshLinesFromProject = (proj, extra = {}) => {
    const lines = linesFromSchedule(proj.schedule || [], proj.jobType, proj.gate)
    setSession((prev) => ({
      ...prev,
      lines,
      lengthOverrides: {},
      totalOverrides: {},
      weightOverrides: {},
      ...extra,
    }))
    return lines
  }

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsDataURL(file)
    })

  const fingerprintFile = async (file) => {
    try {
      const buf = await file.arrayBuffer()
      const hash = await crypto.subtle.digest('SHA-256', buf)
      return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      return `${file.name}-${file.size}-${file.lastModified}`
    }
  }

  const runExtract = async (dataUrl, { corrections = '', drawingName = '', fingerprint = '' } = {}) => {
    if (onNeedOnline?.('vision')) return null
    patchSession({ busy: true, error: '' })
    try {
      const extracted = await extractSteelSchedule(dataUrl, {
        provider: online ? 'gemini' : 'tesseract',
        corrections,
      })
      const nextProject = onApplyExtraction?.(extracted, {
        dataUrl,
        drawingName,
        fingerprint,
        corrections,
      })
      return nextProject
    } catch (err) {
      const message = err?.message || 'Could not read the drawing.'
      patchSession({ error: message, busy: false })
      pushMessages(makeMsg('assistant', `I could not finish reading the drawing: ${message}`))
      return null
    } finally {
      patchSession({ busy: false })
    }
  }

  const onFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!canUploadDrawing || onGuardUpload?.() === false) {
      event.target.value = ''
      onRequireSubscription?.()
      pushMessages(
        makeMsg(
          'assistant',
          'Free drawing uploads are used up. Open Subscriptions and pay $100/month to upload more plans.',
        ),
      )
      return
    }
    if (onNeedOnline?.('drawing')) {
      event.target.value = ''
      return
    }
    const consumed = onConsumeFreeUpload?.()
    if (consumed && consumed.ok === false) {
      event.target.value = ''
      return
    }
    const leftAfter = consumed && typeof consumed.left === 'number' ? consumed.left : null
    patchSession({ busy: true, error: '' })
    pushMessages(makeMsg('user', `Uploaded ${file.name}`))
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const fingerprint = await fingerprintFile(file)
      const kind = file.type.includes('pdf') || /\.pdf$/i.test(file.name) ? 'pdf' : 'image'
      onUpdateProject?.({
        drawing: dataUrl,
        drawingName: file.name,
        drawingFingerprint: fingerprint,
        drawingKind: kind,
      })
      const nextProject = await runExtract(dataUrl, {
        drawingName: file.name,
        fingerprint,
      })
      if (!nextProject) return
      const explanation = buildDrawingExplanation(nextProject)
      refreshLinesFromProject(nextProject, { phase: 'explain' })
      let freemiumLine = ''
      if (!subscriptionActive && leftAfter != null) {
        if (leftAfter === 2) {
          freemiumLine = '\n\n⚠ 2 free uses left — after that you need a subscription to upload new drawings.'
        } else if (leftAfter === 0) {
          freemiumLine = '\n\nThat was your last free drawing upload. Subscribe to upload more plans.'
        } else if (leftAfter > 0) {
          freemiumLine = `\n\n(${leftAfter} free drawing upload${leftAfter === 1 ? '' : 's'} left.)`
        }
      }
      pushMessages(
        makeMsg(
          'assistant',
          `Recognised as ${jobTypeLabel?.(nextProject.jobType, nextProject.drawingType) || nextProject.jobType}.\n\n${explanation}${freemiumLine}`,
        ),
      )
    } catch (err) {
      pushMessages(makeMsg('assistant', err?.message || 'Upload failed.'))
      patchSession({ busy: false })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const syncProjectFromViews = (nextSession = session) => {
    const derived = deriveSessionViews(nextSession, project, pricing)
    // Prefer edited totals, then weight products, when writing back to the project schedule.
    const bakedLines = derived.lines.map((line) => {
      const total = derived.totals.find(
        (row) => row.lineIds?.includes(line.id) || row.material === line.material,
      )
      const wRow = derived.weightRows.find(
        (row) => row.lineIds?.includes(line.id) || row.id === line.material || row.material === line.material,
      )
      return {
        ...line,
        lengthM: wRow?.lengthM ?? total?.lengthM ?? line.lengthM,
        kgPerM: wRow?.kgPerM ?? line.kgPerM,
        weightKg: wRow?.totalKg ?? line.weightKg,
      }
    })
    const schedule2 = syncScheduleFromLines(project.schedule || [], bakedLines, derived.jobType)
    onUpdateProject?.({
      schedule: schedule2,
      labourPercent: String(nextSession.labourPercent ?? ''),
      consumablesPercent: String(nextSession.consumablesPercent ?? ''),
      marginPercent: String(nextSession.transportPercent ?? ''),
      transportPercent: String(nextSession.transportPercent ?? ''),
      quoteTotal: derived.boq.total,
      confirmNotes: project.confirmNotes || '',
      descriptionConfirmed: true,
    })
    return derived
  }

  const advancePhase = () => {
    if (!project.drawing && session.phase === 'upload') {
      pushMessages(makeMsg('assistant', 'Upload a drawing first, then type next.'))
      return
    }
    if (!project.jobType && session.phase !== 'upload') {
      pushMessages(makeMsg('assistant', 'I still need to recognise the drawing type.'))
      return
    }

    const jobType = project.jobType
    const from = session.phase
    const to = getNextPhase(from, jobType)
    if (to === from) {
      pushMessages(makeMsg('assistant', 'You are already on the final BOQ. You can save or export PDF.'))
      return
    }

    // Persist length edits into lines before leaving edit phases
    let nextSession = { ...session, phase: to }
    if (from === 'edit_lengths' || from === 'edit_length_totals') {
      const derived = deriveSessionViews(session, project, pricing)
      nextSession = { ...nextSession, lines: derived.lines }
      syncProjectFromViews(nextSession)
    }
    if (from === 'edit_weights') {
      syncProjectFromViews(nextSession)
    }
    if (from === 'unit_prices') {
      const derived = deriveSessionViews(session, project, pricing)
      const patch = pricingPatchFromUnitPrices(derived.priceRows)
      onPersistPricing?.({
        ...patch,
        labourPercent: String(session.labourPercent),
        consumablesPercent: String(session.consumablesPercent),
        transportPercent: String(session.transportPercent),
        marginPercent: String(session.transportPercent),
      })
      syncProjectFromViews(nextSession)
    }

    const msgs = []
    if (to === 'materials_lengths') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Here is each material and its length from the drawing:\n\n${formatLengthsSummary(derived.lines)}`,
        ),
      )
    } else if (to === 'edit_lengths') {
      msgs.push(
        makeMsg(
          'assistant',
          'Edit any length below. When it looks right, type next.',
        ),
      )
    } else if (to === 'length_totals') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Total length of each material type:\n\n${formatTotalsSummary(derived.totals)}`,
        ),
      )
    } else if (to === 'edit_length_totals') {
      msgs.push(
        makeMsg(
          'assistant',
          'Edit totals if needed. Click a quantity to see the Excel-style sum of parts, then type next.',
        ),
      )
    } else if (to === 'weight_schedule') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Unit weights (kg/m) from the drawing tables or the standard rebar schedule:\n\n${formatWeightScheduleSummary(derived.weightRows)}`,
        ),
      )
    } else if (to === 'edit_weights') {
      msgs.push(
        makeMsg(
          'assistant',
          'Edit kg/m values if needed, or tell me which standard schedule to use. Type next when ready.',
        ),
      )
    } else if (to === 'weight_products') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Length × unit weight for each material:\n\n${formatWeightProductsSummary(derived.weightRows)}`,
        ),
      )
    } else if (to === 'unit_prices') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      const seeded = { ...(nextSession.unitPrices || {}) }
      derived.priceRows.forEach((row) => {
        if (seeded[row.id] == null || seeded[row.id] === '') {
          seeded[row.id] = String(row.unitPrice ?? '')
        }
      })
      nextSession = { ...nextSession, unitPrices: seeded }
      msgs.push(
        makeMsg(
          'assistant',
          usesWeightPath(jobType)
            ? 'Enter unit price for each material. Total price = weight × unit price. Saved prices carry to the next similar drawing.'
            : 'Enter unit price for each material. Total price = length × unit price. Saved prices carry to the next similar drawing.',
        ),
      )
    } else if (to === 'cost_summary') {
      const derived = deriveSessionViews(nextSession, project, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Material cost summary:\n\n${formatCostSummary(derived.priceRows)}`,
        ),
      )
    } else if (to === 'boq') {
      const derived = syncProjectFromViews(nextSession)
      msgs.push(
        makeMsg(
          'assistant',
          `BOQ ready. Material cost $${derived.boq.materials.toFixed(2)}. Adjust labour, consumables, and transport percentages anytime. Total estimated price $${derived.boq.total.toFixed(2)}.`,
        ),
      )
    }

    setSession((prev) => ({
      ...prev,
      ...nextSession,
      messages: [...prev.messages, ...msgs],
    }))
  }

  const handleCorrection = async (text) => {
    pushMessages(makeMsg('user', text))
    if (!project.drawing) {
      pushMessages(makeMsg('assistant', 'Upload a drawing first so I can apply corrections.'))
      return
    }
    if (onNeedOnline?.('vision')) return

    // Lightweight local weight/price hints without full re-extract when possible
    const lower = text.toLowerCase()
    const weightMatch = lower.match(/\b(y\d{1,2})\s*(?:=|is|:)?\s*([\d.]+)\s*kg\/?m\b/i)
    if (weightMatch && usesWeightPath(project.jobType)) {
      const material = weightMatch[1].toUpperCase()
      const kg = weightMatch[2]
      setSession((prev) => ({
        ...prev,
        weightOverrides: { ...prev.weightOverrides, [material]: kg },
        messages: [
          ...prev.messages,
          makeMsg('assistant', `Updated ${material} to ${kg} kg/m. The weight products will use this value.`),
        ],
      }))
      return
    }

    patchSession({ busy: true })
    const nextProject = await runExtract(project.drawing, {
      corrections: text,
      drawingName: project.drawingName,
      fingerprint: project.drawingFingerprint,
    })
    if (!nextProject) return
    const explanation = buildDrawingExplanation(nextProject)
    refreshLinesFromProject(nextProject)
    pushMessages(
      makeMsg(
        'assistant',
        `Updated from your note.\n\n${explanation}\n\nYou are still on the current step — type next to continue, or send another correction.`,
      ),
    )
  }

  const onSend = async (text) => {
    if (isNextCommand(text)) {
      pushMessages(makeMsg('user', text))
      advancePhase()
      return
    }
    await handleCorrection(text)
  }

  const printBoqPdf = () => {
    const derived = deriveSessionViews(session, project, pricing)
    const { boq, priceRows } = derived
    const linesHtml = priceRows
      .map(
        (row) =>
          `<tr><td>${row.description || row.material}</td><td>${row.quantityLabel}</td><td>${Number(
            row.unitPrice,
          ).toFixed(2)}</td><td>${Number(row.totalPrice).toFixed(2)}</td></tr>`,
      )
      .join('')
    const title = `BOQ — ${project.name || 'Quote'}`
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#1c1915}
        h1{font-size:1.6rem;margin:0 0 8px}
        h2{font-size:1.05rem;margin:20px 0 8px}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px}
        th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
        .sub{font-weight:700}
        .tot{font-size:1.2rem;margin-top:20px}
        @media print{body{padding:12px}}
      </style></head><body>
      <h1>${project.name || 'Fabrication BOQ'}</h1>
      <p>${project.client ? `Client: ${project.client}` : ''}</p>
      <h2>Material cost summary</h2>
      <table><thead><tr><th>Material</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
      <tbody>${linesHtml}
      <tr class="sub"><td colspan="3">Material cost</td><td>$${boq.materials.toFixed(2)}</td></tr>
      </tbody></table>
      <h2>Add-ons</h2>
      <p>Labour ${boq.labourPercent}%: $${boq.labour.toFixed(2)}</p>
      <p>Consumables ${boq.consumablesPercent}%: $${boq.consumables.toFixed(2)}</p>
      <p>Transport ${boq.transportPercent}%: $${boq.transport.toFixed(2)}</p>
      <p class="tot"><strong>Total estimated price: $${boq.total.toFixed(2)}</strong></p>
      </body></html>`

    // Hidden iframe print — avoids popup blockers that break window.open('', '_blank').
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', title)
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)
    const frameWindow = iframe.contentWindow
    const frameDoc = frameWindow?.document
    if (!frameDoc) {
      document.body.removeChild(iframe)
      pushMessages(makeMsg('assistant', 'Could not open the print dialog. Try again, or use Save quote first.'))
      return
    }
    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()
    const cleanup = () => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      } catch {
        /* ignore */
      }
    }
    const runPrint = () => {
      try {
        frameWindow.focus()
        frameWindow.print()
        pushMessages(
          makeMsg(
            'assistant',
            'Print dialog opened — choose “Save as PDF” (or your PDF printer) to export the BOQ.',
          ),
        )
      } catch {
        pushMessages(makeMsg('assistant', 'Print failed. Check browser print permissions and try again.'))
      }
      setTimeout(cleanup, 1500)
    }
    // Give the frame a tick to layout before printing.
    setTimeout(runPrint, 250)
  }

  const openDrawing = () => {
    if (!project.drawing) return
    if (onOpenDrawing) {
      onOpenDrawing()
      return
    }
    // Fallback: blob/object URL works better than window.open(dataUrl) for large PDFs.
    try {
      const src = project.drawing
      if (src.startsWith('data:')) {
        const a = document.createElement('a')
        a.href = src
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.download = project.drawingName || (isPdfDrawing(project) ? 'drawing.pdf' : 'drawing')
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }
      window.open(src, '_blank', 'noopener,noreferrer')
    } catch {
      pushMessages(makeMsg('assistant', 'Could not open the drawing.'))
    }
  }

  const saveQuote = () => {
    const derived = syncProjectFromViews(session)
    onPersistPricing?.({
      ...pricingPatchFromUnitPrices(derived.priceRows),
      labourPercent: String(session.labourPercent),
      consumablesPercent: String(session.consumablesPercent),
      transportPercent: String(session.transportPercent),
      marginPercent: String(session.transportPercent),
    })
    onSaveQuote?.({
      kind: project.jobType,
      title: project.name || 'Drawing quote',
      client: project.client,
      total: derived.boq.total,
      materials: derived.boq.materials,
      labour: derived.boq.labour,
      consumables: derived.boq.consumables,
      transport: derived.boq.transport,
      labourPercent: derived.boq.labourPercent,
      consumablesPercent: derived.boq.consumablesPercent,
      transportPercent: derived.boq.transportPercent,
      lines: derived.priceRows.map((row) => ({
        name: row.description || row.material,
        detail: row.quantityLabel,
        cost: row.totalPrice,
      })),
    })
    pushMessages(
      makeMsg('assistant', `Quote saved at $${derived.boq.total.toFixed(2)}.`),
    )
  }

  const phase = session.phase
  const showLengthsTable = phase === 'edit_lengths'
  const showTotalsTable = phase === 'edit_length_totals'
  const showWeightsTable = phase === 'edit_weights'
  const showPricesTable = phase === 'unit_prices'
  const showBoq = phase === 'boq'

  const pdfDrawing = isPdfDrawing(project)

  return (
    <div className={`drawing-chat-session${project.drawing ? ' has-open-drawing' : ''}`}>
      {project.drawing ? (
        <div className="drawing-open-sticky" role="region" aria-label="Open uploaded drawing">
          <button type="button" className="drawing-open-sticky-btn" onClick={openDrawing}>
            {pdfDrawing ? 'Open drawing PDF' : 'Open drawing'}
          </button>
          <span className="drawing-open-sticky-name" title={project.drawingName || ''}>
            {project.drawingName || (pdfDrawing ? 'Drawing.pdf' : 'Drawing')}
          </span>
          {!subscriptionActive ? <span className="fab-freemium-sticker fab-freemium-sticker-sm">Freemium</span> : null}
        </div>
      ) : null}

      <header className="drawing-chat-head">
        <div>
          <div className="fab-title-row">
            <p className="eyebrow">Drawing session</p>
            {!subscriptionActive ? <span className="fab-freemium-sticker fab-freemium-sticker-sm">Freemium</span> : null}
          </div>
          <h1>{project.name || 'Untitled project'}</h1>
          {project.jobType ? (
            <p className="fab-note">{jobTypeLabel?.(project.jobType, project.drawingType)}</p>
          ) : (
            <p className="fab-note">Upload a plan to begin. Type next after each explanation.</p>
          )}
          {!subscriptionActive ? (
            <p className="fab-freemium-meter" role="status">
              {freeDrawsLeft > 0
                ? `${freeDrawsLeft} free drawing upload${freeDrawsLeft === 1 ? '' : 's'} left`
                : 'No free uploads left — subscribe to add a new drawing'}
            </p>
          ) : null}
          {freemiumNote ? <p className="fab-freemium-alert">{freemiumNote}</p> : null}
        </div>
      </header>

      {phase === 'upload' || !project.drawing ? (
        <section className="drawing-upload-card">
          {canUploadDrawing ? (
            <>
              <label className="fab-field">
                Upload photo / PDF (CAD, scan, or hand-drawn sketch)
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onFileChange}
                  disabled={session.busy}
                />
              </label>
              <p className="fab-note">
                Hand-drawn plans on paper or whiteboard photos work too — the vision reader will take off what it can see.
              </p>
            </>
          ) : (
            <div className="drawing-paywall">
              <p className="fab-freemium-alert">
                You used all 6 free drawing uploads. Subscribe ($100/month) to upload new plans.
              </p>
              <button type="button" className="fab-next-btn" onClick={() => onRequireSubscription?.()}>
                View subscriptions
              </button>
            </div>
          )}
          {session.error ? <p className="form-error">{session.error}</p> : null}
        </section>
      ) : null}

      <DrawingExplainPane messages={session.messages} busy={session.busy}>
        {showLengthsTable ? (
          <EditableMaterialTable
            mode="lengths"
            title="Editable lengths"
            rows={views.lines}
            onChangeLength={(id, value) =>
              patchSession({ lengthOverrides: { ...session.lengthOverrides, [id]: value } })
            }
          />
        ) : null}
        {showTotalsTable ? (
          <EditableMaterialTable
            mode="totals"
            title="Editable totals"
            note="Click a quantity to open the formula box. Edit it, then Apply & remember to save it in system memory."
            rows={views.totals}
            onChangeTotal={(id, value) =>
              patchSession({ totalOverrides: { ...session.totalOverrides, [id]: value } })
            }
            onChangeFormula={(id, value) => {
              const evaluated = safeEvalFormula(value)
              patchSession({
                formulaOverrides: { ...(session.formulaOverrides || {}), [id]: value },
                ...(evaluated != null
                  ? { totalOverrides: { ...session.totalOverrides, [id]: String(evaluated) } }
                  : {}),
              })
            }}
            onApplyFormula={(id, formula, row) => {
              const evaluated = safeEvalFormula(formula)
              const quantity = evaluated != null ? evaluated : row?.lengthM
              rememberQtyFormula(id, {
                formula,
                quantity,
                material: row?.material,
              })
              patchSession({
                formulaOverrides: { ...(session.formulaOverrides || {}), [id]: formula },
                totalOverrides: {
                  ...session.totalOverrides,
                  ...(quantity != null ? { [id]: String(quantity) } : {}),
                },
              })
              pushMessages(
                makeMsg(
                  'assistant',
                  evaluated != null
                    ? `Saved ${row?.material || id} formula to system memory. Result = ${Number(evaluated).toFixed(3)} m.`
                    : `Saved ${row?.material || id} formula text to system memory.`,
                ),
              )
              return {
                quantity,
                message:
                  evaluated != null
                    ? `Saved · result ${Number(evaluated).toFixed(3)} m`
                    : 'Formula text saved to memory',
              }
            }}
          />
        ) : null}
        {showWeightsTable ? (
          <EditableMaterialTable
            mode="weights"
            title="Editable unit weights"
            rows={views.weightRows}
            onChangeWeight={(id, value) =>
              patchSession({ weightOverrides: { ...session.weightOverrides, [id]: value } })
            }
          />
        ) : null}
        {showPricesTable ? (
          <EditableMaterialTable
            mode={usesWeightPath(project.jobType) ? 'prices-weight' : 'prices-length'}
            title="Unit prices"
            rows={views.priceRows}
            onChangeUnitPrice={(id, value) =>
              patchSession({ unitPrices: { ...session.unitPrices, [id]: value } })
            }
          />
        ) : null}
        {showBoq ? (
          <BoqSummary
            boq={views.boq}
            priceRows={views.priceRows}
            projectName={project.name}
            onChangePercent={(key, value) => {
              patchSession({ [key]: value })
              onPersistPricing?.({
                labourPercent: key === 'labourPercent' ? value : String(session.labourPercent),
                consumablesPercent:
                  key === 'consumablesPercent' ? value : String(session.consumablesPercent),
                transportPercent:
                  key === 'transportPercent' ? value : String(session.transportPercent),
                marginPercent:
                  key === 'transportPercent' ? value : String(session.transportPercent),
              })
            }}
            onPrintPdf={printBoqPdf}
            onSave={saveQuote}
          />
        ) : null}
      </DrawingExplainPane>

      <DrawingChatBar
        busy={session.busy}
        disabled={false}
        onSend={onSend}
        onNext={() => {
          pushMessages(makeMsg('user', 'next'))
          advancePhase()
        }}
        showNext={phase !== 'upload' || Boolean(project.drawing)}
      />
    </div>
  )
}
