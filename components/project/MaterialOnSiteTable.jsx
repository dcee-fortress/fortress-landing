import { formatMaterialAmount } from "@/lib/plantCostCalculations"

function quantityText(amount, unit) {
  const formatted = formatMaterialAmount(amount)
  return unit ? `${formatted} ${unit}` : formatted
}

export default function MaterialOnSiteTable({ rows, emptyMessage }) {
  if (!rows?.length) {
    return <p className="px-6 py-12 text-center text-sm text-zinc-500">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Description of good</th>
            <th className="px-4 py-3 text-right">Goods on site</th>
            <th className="px-4 py-3 text-right">Goods used on site</th>
            <th className="px-4 py-3">Location used</th>
            <th className="px-4 py-3 text-right">Goods left on site</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-3 font-medium text-zinc-900">{row.description}</td>
              <td className="px-4 py-3 text-right text-zinc-800">
                {quantityText(row.goodsOnSite, row.unit)}
              </td>
              <td className="px-4 py-3 text-right text-zinc-800">
                {quantityText(row.goodsUsed, row.unit)}
              </td>
              <td className="px-4 py-3 text-zinc-800">{row.location || "—"}</td>
              <td className="px-4 py-3 text-right text-zinc-800">
                {quantityText(row.goodsLeft, row.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
