# Sessions 2026-09-16/17 — Order Guide P1 SHIPPED (catalog ingestion, search, categories)

`/sc:load` → P1 build → `/sc:reflect` → category seeding → `/sc:save`.
**5 commits on `main`, NOT pushed** (owner's call — pushing deploys to Vercel).

## P0 is CANCELLED, not deferred
The owner researched the Gemini upgrade himself and **chose not to do it**: the parse is
stable and a swap risked more than it offered. CLAUDE.md now records this. **Do not
re-propose the model upgrade unasked.**

## What shipped (P1)
- `app/src/lib/catalogParse.js` — pure parse/merge/payload, no React/network/xlsx import
  (caller injects the sheet reader), so the shipped code runs headless against the files.
- `CatalogUploadPanel.jsx` (raw exports → prices) and `CategorySeedPanel.jsx` (master list
  → categories) — two SEPARATE panels on purpose.
- `SupplierCatalog.jsx` at `/office/catalog` — search + category filter.
- Migrations: `supplier_products` + `supplier_catalog_uploads`; RPCs
  `seed_supplier_categories(jsonb)` and `supplier_categories()`. All applied to prod.

## Verified (all against the real DB)
1,381 products / 394 price-varies / 6 unpriced / 219 catch-weight / 35 needing a pack size,
from 3,008 raw rows across 13 files. Re-upload is idempotent. Category seeding: 1,381
seeded, and a second run seeded 0 / skipped 1,381 — the sticky rule proven. The owner
exercised the upload button himself (third `supplier_catalog_uploads` row, 09-17 17:35).

## Design calls worth keeping
- **Highest-price-wins is scoped to ONE batch.** Across uploads it is a ratchet.
- **`case_price` derived at ingest**, never at read — 219 catch-weight items.
- **Cross-class conversion is forbidden** (weight/volume/count). A mismatch is a gap with a
  reason, never a guess. Density is never needed.
- **Category seeding is its own action**, not part of ingestion; the RPC fills only NULLs.
- **One RPC over ~352 per-pair updates** — atomic, cannot half-categorise.

## Two mistakes I made, both now memories
1. [[feedback-verification-must-share-the-shipped-code]] — my harness RETYPED the upsert
   payload, so it proved the table's contract and nothing about the component; they had
   already drifted. And I accepted "everything looks fine" as proof of a path that had
   never run (`supplier_catalog_uploads` held only my own row).
2. [[reference-powershell-mangles-bytes]] — a `Get-Content`/`Set-Content -Encoding UTF8`
   round-trip put 183 mojibake sequences in CHANGES.md and 88 in the archive, 7 of which
   reached a commit. Restored from git; redone with python/Edit.

## Next
P2 menu ingestion (8 PDFs → `menu_dishes` drafts + confirm UI), per
`claudedocs/design_beo_order_guide_2026-09-15.md` §5. Top risk stays confirmation volume
(~250-300 dishes): phase by menu, Custom Buffets + Plated Dinners first.

Open: the CategorySeedPanel button itself is untested (categories already seeded, so it
correctly reports a no-op); `price_as_of` records the UPLOAD date, not the supplier's quote
date, which the export filenames carry.
