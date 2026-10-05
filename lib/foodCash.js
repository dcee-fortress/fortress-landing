import { createCashBook } from "@/lib/cashBook"

export const FOOD_CASH_STORAGE_KEY = "grove-food-cash"

export const foodCashBook = createCashBook({
  storageKey: FOOD_CASH_STORAGE_KEY,
  rowIdPrefix: "fc",
  withVat: false,
  trashType: "food-cash-daily",
  label: "Food cash",
})

export const restoreFoodCashDayFromTrash = foodCashBook.restoreDayFromTrash
