"use client"

import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
} from "@/lib/plantCostCalculations"

export default function AcquiredGoodsBalanceHeading({
  totalQuantity = 0,
  totalCost = 0,
  periodLabel = "this period",
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Acquired goods balance
      </p>
      <p className="mt-1 text-sm text-emerald-900/80">
        Total goods acquired for {periodLabel} from the Goods acquired dashboards.
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-emerald-800/70">Quantity acquired</dt>
          <dd className="text-lg font-semibold tabular-nums text-emerald-950">
            {formatMaterialAmount(totalQuantity)}
          </dd>
        </div>
        <div>
          <dt className="text-emerald-800/70">Total cost acquired</dt>
          <dd className="text-lg font-semibold tabular-nums text-emerald-950">
            {formatMaterialCurrencyAmount(totalCost)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
