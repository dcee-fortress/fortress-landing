import assert from "node:assert/strict"
import test from "node:test"
import { mergeBoqSourceDescriptionContinuations } from "./boqDescriptionRows.mjs"

test("joins description-only source rows to their numbered BOQ item", () => {
  const rows = [
    { itemNo: "1.1.1", itemName: "Clear platforms of rubbish, debris,", quantity: 10, rate: 2 },
    { itemName: "stumps, roots and other deleterious material." },
    { itemNo: "1.1.2", itemName: "Remove unsuitable material.", quantity: 5, rate: 3 },
  ]

  assert.deepEqual(
    mergeBoqSourceDescriptionContinuations(rows).map(({ itemNo, itemName }) => [itemNo, itemName]),
    [
      ["1.1.1", "Clear platforms of rubbish, debris, stumps, roots and other deleterious material."],
      ["1.1.2", "Remove unsuitable material."],
    ]
  )
})

test("does not append a standalone section heading or orphan text", () => {
  const rows = [
    { itemNo: "1.1.1", itemName: "Clear platforms.", quantity: 10, rate: 2 },
    { itemName: "SITE CLEARANCE" },
    { itemName: "Description without an item row." },
  ]

  assert.deepEqual(
    mergeBoqSourceDescriptionContinuations(rows).map(({ itemNo, itemName }) => [itemNo, itemName]),
    [["1.1.1", "Clear platforms."]]
  )
})

test("does not join text across a blank source row", () => {
  const rows = [
    { itemNo: "1.1.1", itemName: "Clear platforms.", quantity: 10, rate: 2 },
    { itemName: "" },
    { itemName: "Orphan description." },
  ]

  assert.deepEqual(
    mergeBoqSourceDescriptionContinuations(rows).map(({ itemNo, itemName }) => [itemNo, itemName]),
    [["1.1.1", "Clear platforms."]]
  )
})
