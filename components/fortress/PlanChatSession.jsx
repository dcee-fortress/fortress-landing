import { useMemo, useState } from 'react'
import DrawingChatBar from './DrawingChatBar'
import DrawingExplainPane from './DrawingExplainPane'
import EditableMaterialTable from './EditableMaterialTable'
import BoqSummary from './BoqSummary'
import {
  applyPlanSuggestion,
  applyRememberedPlanFormulas,
  buildPlanExplanation,
  buildPlanMaterialLines,
  burglarTypeLabel,
  createEmptyPlanSession,
  derivePlanViews,
  explainBurglarCalculation,
  explainPalisadeCalculation,
  formatPlanCostSummary,
  formatPlanMaterialsSummary,
  formatPlanTotalsSummary,
  getNextPlanPhase,
  isNextCommand,
  pricingPatchFromPlanPrices,
  rememberPlanFormula,
  safeEvalFormula,
} from './planSession'
import { askFabBrain, looksLikeCalculationQuestion, looksLikeFormulaCorrection } from './fabBrain'

const makeMsg = (role, text) => ({
  id: `pmsg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  text,
  at: Date.now(),
})

export default function PlanChatSession({
  kind = 'palisade',
  project,
  draft = {},
  pricing,
  onUpdateDraft,
  onUpdateProject,
  onPersistPricing,
  onSaveQuote,
}) {
  const title = kind === 'burglar' ? 'Burglar bars' : 'Palisade fencing'
  const [session, setSession] = useState(() => {
    const base = createEmptyPlanSession(
      pricing?.transportPercent != null && pricing.transportPercent !== '' ? pricing : {},
    )
    const lines = applyRememberedPlanFormulas(buildPlanMaterialLines(kind, draft))
    const explanation = buildPlanExplanation(kind, draft, project.name, project.client)
    return {
      ...base,
      lines,
      explanation,
      messages: [makeMsg('assistant', explanation)],
    }
  })

  const views = useMemo(
    () => derivePlanViews(session, kind, draft, pricing),
    [session, kind, draft, pricing],
  )

  const patchSession = (patch) => setSession((prev) => ({ ...prev, ...patch }))
  const pushMessages = (...msgs) =>
    setSession((prev) => ({ ...prev, messages: [...prev.messages, ...msgs] }))

  const syncQtyToProject = (lines) => {
    onUpdateProject?.({
      labourPercent: String(session.labourPercent ?? ''),
      consumablesPercent: String(session.consumablesPercent ?? ''),
      transportPercent: String(session.transportPercent ?? ''),
      marginPercent: String(session.transportPercent ?? ''),
      descriptionConfirmed: true,
      quoteTotal: views.boq.total,
      planLines: lines,
    })
  }

  const advancePhase = () => {
    const from = session.phase
    const to = getNextPlanPhase(from)
    if (to === from) {
      pushMessages(makeMsg('assistant', 'You are on the final BOQ. Save or export PDF when ready.'))
      return
    }

    let nextSession = { ...session, phase: to }
    if (from === 'edit_materials' || from === 'edit_totals') {
      const derived = derivePlanViews(session, kind, draft, pricing)
      nextSession = { ...nextSession, lines: derived.lines }
      syncQtyToProject(derived.lines)
    }
    if (from === 'unit_prices') {
      const derived = derivePlanViews(session, kind, draft, pricing)
      onPersistPricing?.({
        ...pricingPatchFromPlanPrices(derived.priceRows),
        labourPercent: String(session.labourPercent),
        consumablesPercent: String(session.consumablesPercent),
        transportPercent: String(session.transportPercent),
        marginPercent: String(session.transportPercent),
      })
    }

    const msgs = []
    if (to === 'materials_summary') {
      const derived = derivePlanViews(nextSession, kind, draft, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Material take-off:\n\n${formatPlanMaterialsSummary(derived.lines)}`,
        ),
      )
    } else if (to === 'edit_materials') {
      msgs.push(makeMsg('assistant', 'Edit any length if needed, then type next.'))
    } else if (to === 'totals_summary') {
      const derived = derivePlanViews(nextSession, kind, draft, pricing)
      msgs.push(
        makeMsg(
          'assistant',
          `Total length of each material:\n\n${formatPlanTotalsSummary(derived.lines)}`,
        ),
      )
    } else if (to === 'edit_totals') {
      msgs.push(
        makeMsg(
          'assistant',
          'Click a figure to see its formula. Edit it, Apply & remember, then type next.',
        ),
      )
    } else if (to === 'unit_prices') {
      const derived = derivePlanViews(nextSession, kind, draft, pricing)
      const seeded = { ...(nextSession.unitPrices || {}) }
      derived.priceRows.forEach((row) => {
        if (seeded[row.id] == null || seeded[row.id] === '') seeded[row.id] = String(row.unitPriceInput ?? row.unitPrice ?? '')
      })
      nextSession = { ...nextSession, unitPrices: seeded }
      msgs.push(
        makeMsg(
          'assistant',
          'Enter unit prices for each material. Totals use length × $/m.',
        ),
      )
    } else if (to === 'cost_summary') {
      const derived = derivePlanViews(nextSession, kind, draft, pricing)
      msgs.push(makeMsg('assistant', formatPlanCostSummary(derived.priceRows)))
    } else if (to === 'boq') {
      const derived = derivePlanViews(nextSession, kind, draft, pricing)
      syncQtyToProject(derived.lines)
      msgs.push(
        makeMsg(
          'assistant',
          `BOQ ready. Material cost $${derived.boq.materials.toFixed(2)}. Adjust labour, consumables, and transport %. Total estimated price $${derived.boq.total.toFixed(2)}.`,
        ),
      )
    }

    setSession((prev) => ({
      ...prev,
      ...nextSession,
      messages: [...prev.messages, ...msgs],
    }))
  }

  const localExplain =
    kind === 'burglar' ? explainBurglarCalculation(draft) : explainPalisadeCalculation(draft)

  const handleSuggestion = async (text) => {
    pushMessages(makeMsg('user', text))
    const { draft: nextDraft, notes, changed } = applyPlanSuggestion(kind, draft, text)
    if (changed) {
      onUpdateDraft?.(nextDraft)
      const lines = applyRememberedPlanFormulas(buildPlanMaterialLines(kind, nextDraft))
      const explanation = buildPlanExplanation(kind, nextDraft, project.name, project.client)
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
          makeMsg('assistant', `${notes.join(' ')}\n\nUpdated description:\n\n${explanation}`),
        ],
      }))
      return
    }

    const wantsWhy = looksLikeCalculationQuestion(text)
    const wantsCorrection = looksLikeFormulaCorrection(text)
    if (wantsWhy || wantsCorrection) {
      patchSession({ busy: true })
      try {
        const brain = await askFabBrain({
          mode: wantsCorrection ? 'assess_correction' : 'explain',
          question: text,
          context: { planKind: kind, draft, lines: views.lines },
        })
        let reply = String(brain?.reply || localExplain).trim() || localExplain
        if (!wantsCorrection) {
          reply += '\n\nType next when you accept this method, or send a correction.'
        } else if (brain?.adopt === false) {
          reply += `\n\nI did not change the default method yet.\nReason: ${brain.reason || 'Need a clearer formula.'}`
        }
        pushMessages(makeMsg('assistant', reply))
      } catch {
        pushMessages(
          makeMsg(
            'assistant',
            `${localExplain}${
              wantsCorrection
                ? '\n\n(Could not reach Gemini for assessment.) Edit the formula box and Apply & remember, or rephrase.'
                : ''
            }`,
          ),
        )
      } finally {
        patchSession({ busy: false })
      }
      return
    }

    const explanation = `${session.explanation}\n\nYour note: ${text}\nAsk “why …” for calculation reasons, or type next to continue.`
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
    const derived = derivePlanViews(session, kind, draft, pricing)
    const { boq, priceRows } = derived
    const linesHtml = priceRows
      .map(
        (row) =>
          `<tr><td>${row.material}</td><td>${row.quantityLabel}</td><td>${Number(row.unitPrice).toFixed(
            2,
          )}</td><td>${Number(row.totalPrice).toFixed(2)}</td></tr>`,
      )
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title} BOQ — ${
      project.name || 'Quote'
    }</title>
      <style>
        body{font-family:Georgia,serif;padding:24px;color:#1c1915}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        h1{font-size:1.4rem}
      </style></head><body>
      <h1>${project.name || title}</h1>
      <p>${title} · client ${project.client || '—'}</p>
      <table><thead><tr><th>Material</th><th>Qty</th><th>Unit $</th><th>Total $</th></tr></thead>
      <tbody>${linesHtml}</tbody></table>
      <p>Materials $${boq.materials.toFixed(2)} · Labour $${boq.labour.toFixed(2)} ·
      Consumables $${boq.consumables.toFixed(2)} · Transport $${boq.transport.toFixed(2)}</p>
      <p><strong>Total $${boq.total.toFixed(2)}</strong></p>
      </body></html>`
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 1000)
  }

  const saveQuote = () => {
    const derived = derivePlanViews(session, kind, draft, pricing)
    onPersistPricing?.({
      ...pricingPatchFromPlanPrices(derived.priceRows),
      labourPercent: String(session.labourPercent),
      consumablesPercent: String(session.consumablesPercent),
      transportPercent: String(session.transportPercent),
      marginPercent: String(session.transportPercent),
    })
    onSaveQuote?.({
      kind,
      title: project.name || `${title} quote`,
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

  const subtitle =
    kind === 'burglar'
      ? `${burglarTypeLabel(draft.barType)} · ${draft.width || '—'}m × ${draft.height || '—'}m`
      : `${draft.length || '—'}m long · ${draft.height || '—'}m high · pales @ ${draft.spacing || '—'}m`

  return (
    <div className="drawing-chat-session">
      <header className="drawing-chat-head">
        <div>
          <p className="eyebrow">{title} session</p>
          <h1>{project.name || `${title} quote`}</h1>
          <p className="fab-note">{subtitle}</p>
        </div>
      </header>

      <DrawingExplainPane messages={session.messages} busy={session.busy}>
        {showEditMaterials ? (
          <EditableMaterialTable
            mode="gate-qty"
            title="Editable material lengths"
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
            note="Click a quantity to open the formula box. Apply & remember saves it for next time."
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
              rememberPlanFormula(id, {
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
                    ? `Saved ${row?.material || id} formula. Result = ${Number(evaluated).toFixed(3)} ${row?.unitLabel || ''}.`
                    : `Saved ${row?.material || id} formula text.`,
                ),
              )
              return {
                quantity,
                message:
                  evaluated != null
                    ? `Saved · result ${Number(evaluated).toFixed(3)} ${row?.unitLabel || ''}`
                    : 'Formula text saved',
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
