# Capex Request Form System

A standalone tool: a public web form that lets anyone outside your team fill in
a Capital Expenditure request, and on submit generates a filled copy of your
exact "15_STLK- Sand Blasing Machine.xlsx" template for download — same layout,
same formatting, same formulas.

## How it works
- `template/capex_template.xlsx` — your original Excel file, used as the base every time (never modified).
- `lib/fillTemplate.js` — loads the template with ExcelJS and writes the submitted values into the exact cells.
  Supports **any number of line items**: the template has 4 pre-built rows; if more are submitted, it
  duplicates a row's formatting to insert extra rows and rewrites every formula that depends on the
  Total/Budget/Appropriation section so the numbers stay correct no matter how many rows were added.
- `server.js` — Express server: `POST /api/submit` fills the file and saves it under a random ID (no
  database needed); `GET /api/download/:id` serves it, so the same link works again later, not just once.
- `public/` — the form itself (plain HTML/CSS/JS, mobile-friendly, dynamic "+ Add item" button).

## Run it
```
npm install
npm start
```
Then open http://localhost:3000 — share that link (or your deployed URL) with anyone outside who
needs to submit a request.

## Deploying
This is a plain Node/Express app — it runs on any host that runs Node (a small VPS, Render, Railway,
an internal server, etc). Point a domain/subdomain at it and share that link externally. Generated
files live in `generated/` on that server's disk, so back that folder up if you want the download
links to keep working long-term (they are not deleted automatically).

## Customizing
- Company name, signature block, and static labels come straight from the template — edit
  `template/capex_template.xlsx` directly in Excel if those ever need to change.
- Field-to-cell mapping lives at the top of `lib/fillTemplate.js` if you need to add/rename fields.
