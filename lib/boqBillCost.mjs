export function calculateBoqBillCost(billRate, quantity) {
  if (
    billRate === null ||
    billRate === undefined ||
    String(billRate).trim() === "" ||
    quantity === null ||
    quantity === undefined ||
    String(quantity).trim() === ""
  ) {
    return null
  }

  const rate = Number(billRate)
  const qty = Number(quantity)
  if (!Number.isFinite(rate) || !Number.isFinite(qty)) return null

  return Math.round(rate * qty * 100) / 100
}
