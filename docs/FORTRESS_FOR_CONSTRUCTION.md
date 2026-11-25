# Fortress for Construction

Separate system from manufacturing / fabrication. Every construction company subdomain uses the same QS stack as Rodcroft (Quantity Survey, Rate analysis, Rate build-up, Valuations, Head QS Overview, Plant on Site, Site reports).

## Core purpose

Link the Client BOQ, Rate Build-up, Daily Production, and Cost Control into one automatic system so the Head QS knows every day if the project is making or losing money.

## Full flow (one line)

Upload Client BOQ FIRST → App reads BOQ descriptions → App creates Build-up Template FROM those descriptions → Vector Memory auto-fills Cost, Production & Rates ONLY for descriptions that match previous BOQs → User edits new descriptions fresh with ZimBuild QS suggestion → Build-up creates 3 rates (Actual = Daily Cost ÷ Daily Production, Bill, Allowable) → Those Build-up rates automatically write into the BOQ Template → Bill cost = Bill Rate × BOQ Quantity → Junior QS enters Daily Production (BOQ-linked only) → Daily Valuations Dashboard updates → Head QS Overview calculates Actual Cost, Bill Cost, Allowable Cost & Margin automatically.

---

## 1. Upload Client BOQ first

- The user uploads the Client BOQ first. This is step 1, always.
- The app reads that BOQ and extracts the **Bill Number**, **Activity Description**, **Unit**, and
  **BOQ Quantity** for each activity.
- Uploaded rates and costs are not used as Rate Build-up values.
- Those BOQ descriptions are the foundation for everything else. Nothing exists outside the BOQ descriptions.

## 2. Build-up Rate Template from BOQ descriptions

- After the BOQ is uploaded and read, Fortress creates the Build-up Rate Template.
- The template is **not blank**. It is pre-filled with the BOQ Activity Descriptions.
- Each row is seeded with the uploaded Bill Number, Activity Description, and Unit.
- BOQ Quantity stays on the BOQ template; it is not a Rate Build-up column.
- **Important:** Daily Production inside the Build-up is **not** the BOQ quantity.
- Daily Production is the quantity produced in a day.
  - Example: BOQ says 1,000 m² total; Build-up says we do 50 m² per day.
- For each BOQ Activity Description there is a matching Build-up row waiting for Daily Cost and Daily Production.

## 3. Build-up — three rates per activity

Inside the Build-up Template the contractor builds **3 rates** for each activity description.

Inputs:

- **Daily Cost:** Labour + Plant + Material (+ overheads applied in bill build) for one day
- **Daily Production:** Quantity produced in one day (edited by the user)

Rates:

| Rate | Meaning | How it is built |
| --- | --- | --- |
| **Actual Rate** | Real cost rate | Daily Cost ÷ Daily Production |
| **Bill Rate** | What we bill the client | Actual Rate path plus overheads / profit markup set by the contractor |
| **Allowable Rate** | Target / budgeted unit cost | Built in the same template as the allowed cost per unit |

All three rates sit on the same Activity Description row from the same Daily Cost and Daily Production.

## 4. ZimBuild QS + Vector Memory — auto-fill rule

While rates are built:

- **ZimBuild QS** suggests market Daily Cost and Daily Production for each activity (Zimbabwe market guidance).
- **Vector Memory** remembers Daily Cost, Daily Production, Daily Rates, and Build-up fields the contractor has saved before for each activity description.

**Strict auto-fill rule**

- When the user uploads the **next** BOQ, the Build-up Rate Template auto-fills Cost, Production, Daily Rates, etc. **only** from previous descriptions that match the new BOQ descriptions.
- Matching description → fill with previous Daily Cost, Daily Production, Actual Rate, Bill Rate, Allowable Rate (and related Build-up fields).
- Non-matching description → stay blank for a fresh build; only ZimBuild QS suggestion helps.
- After the user edits and saves production / costs, Vector Memory stores and updates that description for the next BOQ.

For each description Fortress can show both:

1. **ZimBuild QS suggestion** — market Daily Cost and Daily Production  
2. **Vector Memory auto-fill** — the contractor’s own past figures, only when the description matched a previous BOQ description

Never start from blank for work done before. For new work, start from ZimBuild QS only.

## 5. BOQ automatic fill-in

Most Client BOQs arrive with missing Cost and Rate. Fortress fills them from the Build-up:

- Rates from the Build-up Rate Template write into the BOQ Template.
- Allowable rate and bill rate on the BOQ are read-only values from Rate Build-up.
- Bill cost is calculated with the BOQ quantity:

**Bill cost in BOQ = Bill rate × BOQ Quantity**

Result: a complete Client BOQ with Rate and Cost filled from the Build-up.

## 6. Daily production entry — Junior QS

- The Junior QS enters production daily in the app.
- **Strict rule:** Production descriptions are always linked to the BOQ.
- No free-text new descriptions. Choose only from BOQ description suggestions, then enter the quantity produced that day.

## 7. Daily Valuations Dashboard

Once production is entered it shows immediately: Description, Daily Production, and Daily Value — the live record of what was done on site.

## 8. Head QS Overview — automatic roll-up

Daily Production from the Junior QS updates the Head QS Overview automatically. For each activity the same three Build-up rates roll side-by-side:

- **Actual Rate** — what it actually costs  
- **Bill Rate** — what we bill  
- **Allowable Rate** — what it should cost  

Costs:

- Actual Cost = Daily Production × Actual Rate  
- Bill Cost = Daily Production × Bill Rate  
- Allowable Cost = Daily Production × Allowable Rate  

Margin:

- Margin = Bill Cost − Actual Cost  
- Margin % = (Bill Cost − Actual Cost) ÷ Bill Cost × 100  

The Head QS sees in real time, per activity and per project: on Bill Rate, on Allowable Rate, or losing money on Actual Rate.

---

## Construction subdomains

Rodcroft is the reference construction tenant. **Every construction company subdomain** (`systemType: construction`) uses the same Rodcroft construction dashboard and QS modules. Manufacturing and fabrication stay on their own systems.
