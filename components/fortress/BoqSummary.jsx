export default function BoqSummary({
  boq,
  priceRows = [],
  onChangePercent,
  onPrintPdf,
  onSave,
  projectName = '',
}) {
  if (!boq) return null

  const addOnRows = [
    {
      id: 'labour',
      label: 'Labour',
      percentKey: 'labourPercent',
      percent: boq.labourPercent,
      value: boq.labour,
    },
    {
      id: 'consumables',
      label: 'Consumables',
      percentKey: 'consumablesPercent',
      percent: boq.consumablesPercent,
      value: boq.consumables,
    },
    {
      id: 'transport',
      label: 'Transport',
      percentKey: 'transportPercent',
      percent: boq.transportPercent,
      value: boq.transport,
    },
  ]

  return (
    <div className="drawing-boq">
      <h2>Bill of quantities</h2>
      {projectName ? <p className="fab-note">{projectName}</p> : null}

      <h3 className="drawing-boq-section-title">Material cost summary</h3>
      <ul className="drawing-boq-list">
        {priceRows.length ? (
          priceRows.map((row) => (
            <li key={row.id} className="drawing-boq-row drawing-boq-row-material">
              <div className="drawing-boq-label">
                <strong>{row.material || row.description}</strong>
                {row.quantityLabel ? <small>{row.quantityLabel}</small> : null}
              </div>
              <span className="drawing-boq-value">${Number(row.totalPrice || 0).toFixed(2)}</span>
            </li>
          ))
        ) : (
          <li className="drawing-boq-row">
            <span className="fab-note">No material lines yet.</span>
          </li>
        )}
        <li className="drawing-boq-row drawing-boq-row-subtotal">
          <div className="drawing-boq-label">
            <strong>Material cost</strong>
          </div>
          <span className="drawing-boq-value">${Number(boq.materials || 0).toFixed(2)}</span>
        </li>
      </ul>

      <h3 className="drawing-boq-section-title">Add-ons</h3>
      <ul className="drawing-boq-list">
        {addOnRows.map((row) => (
          <li key={row.id} className="drawing-boq-row">
            <div className="drawing-boq-label">
              <strong>{row.label}</strong>
              <label className="drawing-boq-pct">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={row.percent ?? ''}
                  onChange={(event) => onChangePercent?.(row.percentKey, event.target.value)}
                  aria-label={`${row.label} percent`}
                />
                <span>%</span>
              </label>
            </div>
            <span className="drawing-boq-value">${Number(row.value || 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <p className="drawing-boq-total">
        <strong>Total estimated price</strong>
        <span>${Number(boq.total || 0).toFixed(2)}</span>
      </p>
      <div className="drawing-boq-actions">
        <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => onPrintPdf?.()}>
          Save as PDF
        </button>
        <button type="button" className="fab-next-btn" onClick={() => onSave?.()}>
          Save quote
        </button>
      </div>
    </div>
  )
}
