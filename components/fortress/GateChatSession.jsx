import { useMemo, useState } from 'react'
import DrawingChatBar from './DrawingChatBar'
import DrawingExplainPane from './DrawingExplainPane'
import EditableMaterialTable from './EditableMaterialTable'
import BoqSummary from './BoqSummary'
import {
  applyGateSuggestion,
  applyRememberedGateFormulas,
  assessLocalTube50Correction,
  buildGateExplanation,
  buildGateMaterialLines,
  createEmptyGateSession,
  deriveGateViews,
  explainGateTube50Calculation,
  forgetGateFormula,
  formatGateCostSummary,
  formatGateMaterialsSummary,
  formatGateTotalsSummary,
  gateDesignLabel,
  gateTypeLabel,
  getNextGatePhase,
  isNextCommand,
  pricingPatchFromGatePrices,
  rememberGateFormula,
  rememberGateMethodPatch,
  safeEvalFormula,
} from './gateSession'
import { askFabBrain, looksLikeCalculationQuestion, looksLikeFormulaCorrection } from './fabBrain'

const makeMsg = (role, text) => ({
  id: `gmsg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  text,
  at: Date.now(),
})

export default function GateChatSession({
  project,
  pricing,
  onUpdateGate,
  onUpdateProject,
  onPersistPricing,
  onSaveQuote,
}) {
  const gate = project.gate || {}
  const [session, setSession] = useState(() => {
    const base = createEmptyGateSession(
      pricing?.transportPercent != null && pricing.transportPercent !== ''
        ? pricing
        : {},
    )
    const lines = applyRememberedGateFormulas(buildGateMaterialLines(gate))
    const explanation = buildGateExplanation(gate, project.name, project.client)
    return {
      ...base,
      lines,
      explanation,
      messages: [makeMsg('assistant', explanation)],
    }
  })

  const views = useMemo(
    () => deriveGateViews(session, gate, pricing),
    [session, gate, pricing],
  )

  const patchSession = (patch) => setSession((prev) => ({ ...prev, ...patch }))

  const pushMessages = (...msgs) =>
    setSession((prev) => ({ ...prev, messages: [...prev.messages, ...msgs] }))

  const syncGateQtyToProject = (lines) => {
    const byId = Object.fromEntries(lines.map((row) => [row.id, row.quantity]))
    onUpdateGate?.({
      qty50: byId.tube50 != null ? String(byId.tube50) : '',
      qty25: byId.tube25 != null ? String(byId.tube25) : '',
      qtySheet: byId.sheet != null ? String(byId.sheet) : '',
      qtyBeam: byId.uchannel != null ? String(byId.uchannel) : '',
      labourPercent: String(session.labourPercent ?? ''),
      consumablesPercent: String(session.consumablesPercent ?? ''),
      marginPercent: String(session.transportPercent ?? ''),
    })
    onUpdateProject?.({
      labourPercent: String(session.labourPercent ?? ''),
      consumablesPercent: String(session.consumablesPercent ?? ''),
      transportPercent: String(session.transportPercent ?? ''),
      marginPercent: String(session.transportPercent ?? ''),
      descriptionConfirmed: true,
      quoteTotal: views.boq.total,
    })
  }

  const advancePhase = () => {
    const from = session.phase
    const to = getNextGatePhase(from)
    if (to === from) {
      pushMessages(makeMsg('assistant', 'You are on the final BOQ. Save or export PDF when ready.'))
      return
    }

    let nextSession = { ...session, phase: to }
    if (from === 'edit_materials' || from === 'edit_totals') {
      const derived = deriveGateViews(session, gate, pricing)
      nextSession = { ...nextSession, lines: derived.lines }
      syncGateQtyToProject(derived.lines)
    }
    if (from === 'unit_prices') {
      const derived = deriveGateViews(session, gate, pricing)
      onPersistPricing?.({
        ...pricingPatchFromGatePrices(derived.priceRows),
        labourPercent: String(session.labourPercent),
        consumablesPercent: String(session.consumablesPercent),
        transportPercent: String(session.transportPercent),
        marginPercent: String(session.transportPercent),
      })
    }

    const msgs = []
    if (to === 'materials_summary') {
      const derived = deriveGateViews(nextSession, gate, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Materials for this gate (lengths in m, IBR sheet in m²):\n\n${formatGateMaterialsSummary(derived.lines)}`,
        ),
      )
    } else if (to === 'edit_materials') {
      msgs.push(
        makeMsg('assistant', 'Edit any material length or area below. Type next when it looks right.'),
      )
    } else if (to === 'totals_summary') {
      const derived = deriveGateViews(nextSession, gate, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Total length / area of each material:\n\n${formatGateTotalsSummary(derived.lines)}`,
        ),
      )
    } else if (to === 'edit_totals') {
      msgs.push(
        makeMsg(
          'assistant',
          'Click a figure to see its formula (IBR uses area). You can edit the formula or the answer, then type next.',
        ),
      )
    } else if (to === 'unit_prices') {
      const derived = deriveGateViews(nextSession, gate, pricing)
      const seeded = { ...(nextSession.unitPrices || {}) }
      derived.priceRows.forEach((row) => {
        if (seeded[row.id] == null || seeded[row.id] === '') seeded[row.id] = String(row.unitPrice ?? '')
      })
      nextSession = { ...nextSession, unitPrices: seeded }
      msgs.push(
        makeMsg(
          'assistant',
          'Enter unit prices for each material. Totals use length × $/m or area × $/m².',
        ),
      )
    } else if (to === 'cost_summary') {
      const derived = deriveGateViews(nextSession, gate, pricing)
      msgs.push(makeMsg('assistant', formatGateCostSummary(derived.priceRows)))
    } else if (to === 'boq') {
      const derived = deriveGateViews(nextSession, gate, pricing)
      syncGateQtyToProject(derived.lines)
      msgs.push(
        makeMsg(
          'assistant',
          `BOQ ready. Material cost $${derived.boq.materials.toFixed(2)}. Adjust labour, consumables, and transport % — results update instantly. Total estimated price $${derived.boq.total.toFixed(2)}.`,
        ),
      )
    }

    setSession((prev) => ({
      ...prev,
      ...nextSession,
      messages: [...prev.messages, ...msgs],
    }))
  }

  const brainContext = () => ({
    gate,
    lines: deriveGateViews(session, gate, pricing).lines,
  })

  const handleSuggestion = async (text) => {
    pushMessages(makeMsg('user', text))
    const { gate: nextGate, notes, changed } = applyGateSuggestion(gate, text)
    if (changed) {
      onUpdateGate?.(nextGate)
      const lines = applyRememberedGateFormulas(buildGateMaterialLines(nextGate))
      const explanation = buildGateExplanation(nextGate, project.name, project.client)
      setSession((prev) => ({
        ...prev,
        lines,
        explanation,
        quantityOverrides: {},
        totalOverrides: {},
        formulaOverrides: {},
        phase: 'explain',
        messages: [
          ...prev.messages,
          makeMsg(
            'assistant',
            `${notes.join(' ')}\n\nUpdated description:\n\n${explanation}`,
          ),
        ],
      }))
      return
    }

    const wantsWhy = looksLikeCalculationQuestion(text)
    const wantsCorrection = looksLikeFormulaCorrection(text)
    const localExplain = explainGateTube50Calculation(gate, deriveGateViews(session, gate, pricing).lines)

    const adoptMethod = (methodPatch, reason) => {
      rememberGateMethodPatch(methodPatch)
      // Let method-based rebuild win over any stale remembered static qty.
      forgetGateFormula('tube50')
      const lines = applyRememberedGateFormulas(buildGateMaterialLines(gate))
      patchSession({
        lines,
        quantityOverrides: {},
        totalOverrides: {},
        formulaOverrides: {},
      })
      return `\n\n✓ Assessed and adopted into system memory.\nReason: ${reason || 'Valid alternate take-off.'}\nNext gates will calculate 50×50 this way. Type next to continue, or ask another question.`
    }

    // Formula / method questions and corrections — explain reasons, then optionally learn.
    if (wantsWhy || wantsCorrection) {
      patchSession({ busy: true })
      try {
        const mode = wantsCorrection ? 'assess_correction' : 'explain'
        const brain = await askFabBrain({
          mode,
          question: text,
          context: brainContext(),
        })
        let reply = String(brain?.reply || localExplain).trim() || localExplain
        if (wantsCorrection && brain?.adopt && brain?.methodPatch) {
          reply += adoptMethod(brain.methodPatch, brain.reason)
        } else if (wantsCorrection && brain && brain.adopt === false) {
          // Gemini rejected — still try local fabricator heuristic (e.g. L×2+H×2+L).
          const local = assessLocalTube50Correction(text, gate)
          if (local.adopt && local.methodPatch) {
            reply += adoptMethod(local.methodPatch, local.reason)
          } else {
            reply += `\n\nI did not change the default method yet.\nReason: ${brain.reason || local.reason}\nYou can still edit the formula box and tap Apply & remember, or rephrase the correction.`
          }
        } else if (!wantsCorrection) {
          reply += '\n\nType next when you accept this method, or send a correction (e.g. “should be 8.4×2 + 6×2 + 8.4”).'
        }
        pushMessages(makeMsg('assistant', reply))
      } catch {
        // Offline / server down — local reason + local assessment.
        let reply = localExplain
        if (wantsCorrection) {
          const local = assessLocalTube50Correction(text, gate)
          if (local.adopt && local.methodPatch) {
            reply += adoptMethod(local.methodPatch, local.reason)
          } else {
            reply += `\n\n(Could not reach Gemini for live assessment.) ${local.reason}`
          }
        }
        pushMessages(makeMsg('assistant', reply))
      } finally {
        patchSession({ busy: false })
      }
      return
    }

    // Free-text note folded into the explanation without changing dims/type.
    const explanation = `${session.explanation}\n\nYour note: ${text}\nI've kept the current type and design, and will carry this preference into the take-off. Ask “why …” for calculation reasons, or type next to continue.`
    setSession((prev) => ({
      ...prev,
      explanation,
      messages: [...prev.messages, makeMsg('assistant', explanation)],
    }))
  }

  const onSend = async (text) => {
    if (isNextCommand(text)) {
      pushMessages(makeMsg('user', text))
      advancePhase()
      return
    }
    await handleSuggestion(text)
  }

  const printBoqPdf = () => {
    const derived = deriveGateViews(session, gate, pricing)
    const { boq, priceRows } = derived
    const linesHtml = priceRows
      .map(
        (row) =>
          `<tr><td>${row.material}</td><td>${row.quantityLabel}</td><td>${Number(row.unitPrice).toFixed(
            2,
          )}</td><td>${Number(row.totalPrice).toFixed(2)}</td></tr>`,
      )
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Gate BOQ — ${
      project.name || 'Quote'
    }</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#1c1915}
        h1{font-size:1.6rem} h2{font-size:1.05rem;margin-top:20px}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px}
        th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
        .sub{font-weight:700}.tot{font-size:1.2rem;margin-top:20px}
      </style></head><body>
      <h1>${project.name || 'Gate BOQ'}</h1>
      <p>${gateTypeLabel(gate.gateType)} · ${gateDesignLabel(gate.design)} · ${gate.width || '—'}m × ${
      gate.height || '—'
    }m</p>
      <h2>Material cost summary</h2>
      <table><thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
      <tbody>${linesHtml}
      <tr class="sub"><td colspan="3">Material cost</td><td>$${boq.materials.toFixed(2)}</td></tr>
      </tbody></table>
      <h2>Add-ons</h2>
      <p>Labour ${boq.labourPercent}%: $${boq.labour.toFixed(2)}</p>
      <p>Consumables ${boq.consumablesPercent}%: $${boq.consumables.toFixed(2)}</p>
      <p>Transport ${boq.transportPercent}%: $${boq.transport.toFixed(2)}</p>
      <p class="tot"><strong>Total estimated price: $${boq.total.toFixed(2)}</strong></p>
      </body></html>`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        pushMessages(
          makeMsg('assistant', 'Print dialog opened — choose Save as PDF to export the BOQ.'),
        )
      } catch {
        /* ignore */
      }
      setTimeout(() => iframe.remove(), 1500)
    }, 250)
  }

  const saveQuote = () => {
    const derived = deriveGateViews(session, gate, pricing)
    syncGateQtyToProject(derived.lines)
    onPersistPricing?.({
      ...pricingPatchFromGatePrices(derived.priceRows),
      labourPercent: String(session.labourPercent),
      consumablesPercent: String(session.consumablesPercent),
      transportPercent: String(session.transportPercent),
      marginPercent: String(session.transportPercent),
    })
    onSaveQuote?.({
      kind: 'gate',
      title: project.name || 'Gate quote',
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
        name: row.material,
        detail: row.quantityLabel,
        cost: row.totalPrice,
      })),
    })
    pushMessages(makeMsg('assistant', `Quote saved at $${derived.boq.total.toFixed(2)}.`))
  }

  const phase = session.phase
  const showEditMaterials = phase === 'edit_materials'
  const showEditTotals = phase === 'edit_totals'
  const showPrices = phase === 'unit_prices'
  const showBoq = phase === 'boq'

  return (
    <div className="drawing-chat-session">
      <header className="drawing-chat-head">
        <div>
          <p className="eyebrow">Gate session</p>
          <h1>{project.name || 'Gate quote'}</h1>
          <p className="fab-note">
            {gateTypeLabel(gate.gateType)} · {gateDesignLabel(gate.design)} · {gate.width || '—'}m ×{' '}
            {gate.height || '—'}m
          </p>
        </div>
      </header>

      <DrawingExplainPane messages={session.messages} busy={session.busy}>
        {showEditMaterials ? (
          <EditableMaterialTable
            mode="gate-qty"
            title="Editable material lengths / areas"
            rows={views.lines}
            onChangeLength={(id, value) =>
              patchSession({ quantityOverrides: { ...session.quantityOverrides, [id]: value } })
            }
          />
        ) : null}
        {showEditTotals ? (
          <EditableMaterialTable
            mode="gate-totals"
            title="Totals with formulas"
            note="Click a quantity to open the formula box. Edit it, then Apply & remember — it saves to system memory for the next gate."
            rows={views.lines}
            onChangeTotal={(id, value) =>
              patchSession({ totalOverrides: { ...session.totalOverrides, [id]: value } })
            }
            onChangeFormula={(id, value) => {
              const evaluated = safeEvalFormula(value)
              patchSession({
                formulaOverrides: { ...session.formulaOverrides, [id]: value },
                ...(evaluated != null
                  ? { totalOverrides: { ...session.totalOverrides, [id]: String(evaluated) } }
                  : {}),
              })
            }}
            onApplyFormula={(id, formula, row) => {
              const evaluated = safeEvalFormula(formula)
              const quantity = evaluated != null ? evaluated : row?.quantity
              rememberGateFormula(id, {
                formula,
                quantity,
                material: row?.material,
                measure: row?.measure,
                unitLabel: row?.unitLabel,
              })
              patchSession({
                formulaOverrides: { ...session.formulaOverrides, [id]: formula },
                totalOverrides: {
                  ...session.totalOverrides,
                  ...(quantity != null ? { [id]: String(quantity) } : {}),
                },
                lines: (session.lines || views.lines).map((line) =>
                  line.id === id
                    ? { ...line, formula, quantity: quantity ?? line.quantity, fromMemory: true }
                    : line,
                ),
              })
              pushMessages(
                makeMsg(
                  'assistant',
                  evaluated != null
                    ? `Saved ${row?.material || id} formula to system memory. Result = ${Number(evaluated).toFixed(3)} ${row?.unitLabel || ''}.`
                    : `Saved ${row?.material || id} formula text to system memory. Could not auto-calculate — edit the quantity if needed.`,
                ),
              )
              return {
                quantity,
                message:
                  evaluated != null
                    ? `Saved · result ${Number(evaluated).toFixed(3)} ${row?.unitLabel || ''}`
                    : 'Formula text saved to memory',
              }
            }}
          />
        ) : null}
        {showPrices ? (
          <EditableMaterialTable
            mode="prices-gate"
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
        placeholder="Ask why a formula…, correct it, or type next…"
        onSend={onSend}
        onNext={() => {
          pushMessages(makeMsg('user', 'next'))
          advancePhase()
        }}
      />
    </div>
  )
}
