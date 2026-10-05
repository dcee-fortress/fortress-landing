import { createCashBook } from "@/lib/cashBook"

export const PETTY_CASH_STORAGE_KEY = "grove-petty-cash"

export const pettyCashBook = createCashBook({
  storageKey: PETTY_CASH_STORAGE_KEY,
  rowIdPrefix: "pc",
  withVat: true,
  trashType: "petty-cash-daily",
  label: "Petty cash",
})

export const restorePettyCashDayFromTrash = pettyCashBook.restoreDayFromTrash
