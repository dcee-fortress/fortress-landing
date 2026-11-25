import assert from "node:assert/strict"
import test from "node:test"
import { calculateBoqBillCost } from "./boqBillCost.mjs"

test("calculates bill cost from the bill rate and BOQ quantity", () => {
  assert.equal(calculateBoqBillCost(12.345, 8), 98.76)
})

test("keeps a zero bill rate as a zero cost", () => {
  assert.equal(calculateBoqBillCost(0, 8), 0)
})

test("does not calculate bill cost without valid bill rate and quantity", () => {
  assert.equal(calculateBoqBillCost(null, 8), null)
  assert.equal(calculateBoqBillCost(12, null), null)
  assert.equal(calculateBoqBillCost("", 8), null)
  assert.equal(calculateBoqBillCost("invalid", 8), null)
})
