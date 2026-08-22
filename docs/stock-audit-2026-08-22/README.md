# Stock audit — 2026-08-22

Pulled live from production Supabase (`wcygtmcnysbhzgcicocm`) at ~18:30 UTC.
Baseline: the manual stock count staff ran **2026-08-21 22:00 → 2026-08-22 01:00 UTC**
(52 products). Sales window: everything paid since 01:00 UTC — 64 orders, 154 units.

All times are UTC, which is the same as Ghana local time.

## Headline

**No new oversells today.** Every one of today's 145 paid lines resolved to a real
variant row, on both channels, so every sale took stock off the variant it was
actually sold from. That is the first clean day in the data.

The three defects that mattered are all accounted for:

| | |
|---|---|
| Sales that missed their variant row | 0 today (109 historically) |
| New roll-up drift introduced today | 0 |
| Stock not returned after cancel/refund | 3 units, 2 orders — see below |

## Files

| File | Rows | What it holds |
|---|---|---|
| `zero-stock-sold-today.csv` | 18 | Variants that sold today and now read zero — count these by hand |
| `unreturned-stock.csv` | 2 | Orders that took stock and gave none back |
| `drift.csv` | 3 | Products whose roll-up still disagrees with their variant rows |

## How to read `zero-stock-sold-today.csv`

`implied_count_last_night = units_sold_today + variant_stock_now`

These are the only rows where an oversell *could* be hiding, because the decrement
clamps at zero: if the shelf held 2 and 5 sold, stock reads 0 and the extra 3 leave
no trace in the counter.

Nothing here proves an oversell. Each row is consistent with the shelf simply
selling out. But if staff counted, say, 2 Brown Amazon pants in XXL last night and
4 sold today, the difference is real and the count is the only way to see it.
**These 18 rows are the physical count list.** Everything else sold from a variant
that still shows stock, so it cannot have oversold.

Highest risk first — Amazon pants XXL/Brown sold 4 across both channels.

## How to read `unreturned-stock.csv`

Both orders settled (took stock off the shelf) and were then cancelled or refunded.
Nothing gave the units back, because until today no restock path existed.

- **37CEE84E** — POS sale at 17:12, marked delivered, payment cancelled at 17:26.
  2 units still subtracted.
- **2650970D** — storefront sale, refunded 08:10. 1 unit still subtracted.

If the goods physically came back, add 3 units by hand. After the fix ships this
happens automatically and cannot double-apply.

## How to read `drift.csv`

`delta = product_rollup − variant_sum`. Negative means the roll-up sits below the
sum of its variants — the fingerprint of a sale that decremented the product but
not the variant row.

Only **Fashion ARM REST BAG** is live, overstated by 1. The other two are
deactivated; they carry 8 phantom units between them and must not be reactivated
until their variant rows are corrected to match a physical count.

The nightly `/api/cron/reconcile-stock` job now reports this list every morning at
03:00 rather than letting it accumulate unseen.

## What this audit could not do

The activity log records `inventory_count.from` — the value **before** each save —
and never what staff wrote; the edit form sent the `9999` sentinel every time. So
last night's counted figures cannot be read back directly, only inferred as
`current + units sold since`. That inference assumes every sale decremented
correctly, which is exactly the thing under test, so it is used only to size the
physical count list, never to assert a number is right.

This is the gap the `stock_movements` ledger closes. From the moment it is applied,
every movement carries what it was, which order caused it, and what actually landed.
