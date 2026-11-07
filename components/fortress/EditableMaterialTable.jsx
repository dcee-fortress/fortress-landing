import { useEffect, useState } from 'react'
import { lengthFormula } from './drawingSession'

/**
 * mode:
 * - lengths / totals / weights / prices-* (drawing path)
 * - gate-qty / gate-totals / prices-gate (gate path: length or area)
 */
export default function EditableMaterialTable({
  mode = 'lengths',
  rows = [],
  onChangeLength,
  onChangeTotal,
  onChangeWeight,
  onChangeUnitPrice,
  onChangeFormula,
  onApplyFormula,
  title = '',
  note = '',
}) {
  const [formulaFor, setFormulaFor] = useState(null)
  const [formulaDraft, setFormulaDraft] = useState('')
  const [applyNote, setApplyNote] = useState('')

  const activeRow = rows.find((row) => row.id === formulaFor) || null

  useEffect(() => {
    if (!activeRow) {
      setFormulaDraft('')
      return
    }
    const initial =
      activeRow.formula ||
      (mode === 'totals' || mode === 'gate-totals' ? lengthFormula(activeRow) : '') ||
      String(activeRow.quantity ?? activeRow.lengthM ?? '')
    setFormulaDraft(initial)
    setApplyNote('')
  }, [formulaFor, activeRow?.id, activeRow?.formula, mode])

  const openFormula = (row) => {
    setFormulaFor(row.id)
  }

  const closeFormula = () => {
    setFormulaFor(null)
    setApplyNote('')
  }

  const applyFormula = (row) => {
    const draft = formulaDraft
    onChangeFormula?.(row.id, draft)
    const result = onApplyFormula?.(row.id, draft, row)
    if (result?.quantity != null) {
      if (mode === 'totals') onChangeTotal?.(row.id, String(result.quantity))
      else onChangeTotal?.(row.id, String(result.quantity))
    }
    setApplyNote(result?.message || 'Formula saved to system memory.')
  }

  if (!rows.length) {
    return (
      <div className="drawing-table-wrap">
        {title ? <h2>{title}</h2> : null}
        <p className="fab-note">No rows yet.</p>
      </div>
    )
  }

  const formulaPopup = (row) => {
    if (formulaFor !== row.id) return null
    return (
      <div
        className="drawing-formula drawing-formula-edit"
        role="dialog"
        aria-label={`${row.material} formula editor`}
        onMouseDown={(event) => event.preventDefault()}
      >
        <label>
          Formula (editable)
          <textarea
            rows={3}
            value={formulaDraft}
            onChange={(event) => {
              setFormulaDraft(event.target.value)
              onChangeFormula?.(row.id, event.target.value)
            }}
            aria-label={`${row.material} formula`}
          />
        </label>
        <div className="drawing-formula-actions">
          <button type="button" className="drawing-formula-apply" onClick={() => applyFormula(row)}>
            Apply & remember
          </button>
          <button type="button" className="drawing-formula-close" onClick={closeFormula}>
            Close
          </button>
        </div>
        {applyNote ? <small className="drawing-formula-saved">{applyNote}</small> : null}
        <small className="drawing-formula-hint">
          Edit the formula, then Apply. Arithmetic like 4.4*2+2*2 updates the quantity and system memory.
        </small>
      </div>
    )
  }

  return (
    <div className="drawing-table-wrap">
      {title ? <h2>{title}</h2> : null}
      {note ? <p className="fab-note">{note}</p> : null}
      <div className="drawing-table-scroll">
        <table className="drawing-material-table">
          <thead>
            <tr>
              {mode === 'lengths' || mode === 'totals' ? (
                <>
                  <th>Material</th>
                  <th>Length</th>
                </>
              ) : null}
              {mode === 'gate-qty' || mode === 'gate-totals' ? (
                <>
                  <th>Material</th>
                  <th>Length / area</th>
                </>
              ) : null}
              {mode === 'weights' ? (
                <>
                  <th>Steel</th>
                  <th>kg/m</th>
                </>
              ) : null}
              {mode === 'prices-weight' ? (
                <>
                  <th>Material description</th>
                  <th>Weight</th>
                  <th>Unit price</th>
                  <th>Total price</th>
                </>
              ) : null}
              {mode === 'prices-length' || mode === 'prices-gate' ? (
                <>
                  <th>Description of material</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Total price</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (mode === 'lengths') {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.material}</strong>
                      {row.description && row.description !== row.material ? (
                        <small>{row.description}</small>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.lengthM ?? ''}
                        onChange={(event) => onChangeLength?.(row.id, event.target.value)}
                        aria-label={`${row.material} length`}
                      />
                      <span className="drawing-unit">m</span>
                    </td>
                  </tr>
                )
              }

              if (mode === 'gate-qty') {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.material}</strong>
                      {row.description ? <small>{row.description}</small> : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity ?? ''}
                        onChange={(event) => onChangeLength?.(row.id, event.target.value)}
                        aria-label={`${row.material} quantity`}
                      />
                      <span className="drawing-unit">{row.unitLabel || 'm'}</span>
                    </td>
                  </tr>
                )
              }

              if (mode === 'totals') {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.material}</strong>
                      {row.fromMemory ? <small>From memory</small> : null}
                    </td>
                    <td className="drawing-qty-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.lengthM ?? ''}
                        onClick={() => openFormula(row)}
                        onFocus={() => openFormula(row)}
                        onChange={(event) => onChangeTotal?.(row.id, event.target.value)}
                        aria-label={`${row.material} total length`}
                      />
                      <span className="drawing-unit">m</span>
                      {formulaPopup(row)}
                    </td>
                  </tr>
                )
              }

              if (mode === 'gate-totals') {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.material}</strong>
                      <small>
                        {row.measure === 'area' ? 'Area' : 'Length'}
                        {row.fromMemory ? ' · memory' : ''}
                      </small>
                    </td>
                    <td className="drawing-qty-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity ?? ''}
                        onClick={() => openFormula(row)}
                        onFocus={() => openFormula(row)}
                        onChange={(event) => onChangeTotal?.(row.id, event.target.value)}
                        aria-label={`${row.material} total`}
                      />
                      <span className="drawing-unit">{row.unitLabel || 'm'}</span>
                      {formulaPopup(row)}
                    </td>
                  </tr>
                )
              }

              if (mode === 'weights') {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.material}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.kgPerM ?? ''}
                        onChange={(event) => onChangeWeight?.(row.id, event.target.value)}
                        aria-label={`${row.material} kg per m`}
                      />
                      <span className="drawing-unit">kg/m</span>
                    </td>
                  </tr>
                )
              }

              if (mode === 'prices-weight' || mode === 'prices-length' || mode === 'prices-gate') {
                const priceValue =
                  row.unitPriceInput != null ? row.unitPriceInput : row.unitPrice ?? ''
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.description || row.material}</strong>
                      {mode === 'prices-gate' && row.priceUnit ? (
                        <small>Unit {row.priceUnit}</small>
                      ) : null}
                    </td>
                    <td>{row.quantityLabel}</td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={priceValue}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => {
                          // Keep digits / one decimal only; allow fully empty so clear works.
                          const next = event.target.value.replace(/[^\d.]/g, '')
                          const parts = next.split('.')
                          const cleaned =
                            parts.length <= 1
                              ? next
                              : `${parts[0]}.${parts.slice(1).join('')}`
                          onChangeUnitPrice?.(row.id, cleaned)
                        }}
                        aria-label={`${row.material} unit price`}
                      />
                    </td>
                    <td>${Number(row.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                )
              }

              return null
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
