import { foodCashBook } from "@/lib/foodCash"
import { pettyCashBook } from "@/lib/pettyCash"

/** Route root → cash book. Pages pass the id; client views look up data and labels here. */
export const CASH_BOOKS = {
  "petty-cash": {
    id: "petty-cash",
    label: "Petty cash",
    name: "petty cash",
    icon: "banknote",
    data: pettyCashBook,
  },
  "food-cash": {
    id: "food-cash",
    label: "Food cash",
    name: "food cash",
    icon: "utensils",
    data: foodCashBook,
  },
}

export function getCashBook(bookId) {
  return CASH_BOOKS[bookId] ?? CASH_BOOKS["petty-cash"]
}
