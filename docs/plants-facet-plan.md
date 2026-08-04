# Plant Browser — Facet Filtering Plan

Visual version: https://claude.ai/code/artifact/11ddab2a-af14-4511-948a-1ecdc11b92f6

Candidate facets to replace the flat category-tab browsing model, scored against
real field coverage across all 4,688 plants in the database (checked 2026-08-04,
not assumed).

## Why

A single row of category pills (Tree / Shrub / Herbaceous / …) doesn't scale at
4,688 plants — "All" is a useless default view, and even one category still
leaves hundreds of results. Faceted filtering (combinable filters across
several axes at once) degrades gracefully as the dataset grows; flat category
browsing doesn't.

## Coverage overview

| Field | Coverage |
|---|---|
| Plant type | 100.0% |
| Ecological tags | 99.5% (excluded — see below) |
| Light | 98.7% |
| Life cycle | 97.3% |
| Soil drainage | 96.8% |
| USDA hardiness zone | 91.3% |
| Flower color | 90.4% |
| Soil texture | 90.3% |
| Maintenance | 88.9% |
| Bloom season | 87.3% |
| Growth rate | 84.0% |
| Height | 79.4% |
| Soil pH | 72.4% |
| Attracts (wildlife) | 65.7% |
| Watering need | 0.0% (excluded — see below) |

## Recommended for Phase 1 (12 facets)

1. **Plant type** (100%) — multi-select checklist. 11 main types cover 96.7% of
   plants; fold the 14 minor values (Weed, Mushroom, Turfgrass, Succulent…,
   157 plants total) into a single "Other."
2. **Light** (98.7%) — multi-select checklist. Stored as independent tags
   (Full Sun / Partial Shade / Shade), not a compound range — multi-checking
   should OR, not AND.
3. **Soil drainage** (96.8%) — multi-select checklist. Closest real proxy for
   "watering need," which doesn't exist in the source data.
4. **Soil texture** (90.3%) — multi-select checklist.
5. **Soil pH** (72.4%) — multi-select checklist + explicit "Not specified"
   option (lowest coverage of the set).
6. **Bloom season** (87.3%) — multi-select checklist.
7. **Flower color** (90.4%) — multi-select swatches. Drop the "Insignificant"
   value (87 plants) — it's not a color, it means the plant isn't grown for
   its bloom.
8. **Attracts / wildlife** (65.7%) — multi-select checklist. Merge the bottom
   four values (Predatory Insects, Frogs, Reptiles, Bats — 59 plants) into
   "Other wildlife."
9. **Maintenance** (88.9%) — multi-select checklist.
10. **Growth rate** (84.0%) — multi-select checklist.
11. **Height** (79.4%) — bucketed ranges, not a linear slider. Range is
    0.08–275 ft with a median of 5 ft; buckets: Under 1 ft, 1–3 ft, 3–6 ft,
    6–15 ft, 15–30 ft, 30 ft+.
12. **USDA hardiness zone** (91.3%) — single zone picker (1–13), matching any
    plant whose min–max range spans the selected zone (not a raw min/max
    slider).

**Life cycle** (97.3%) is a candidate 13th facet but overlaps conceptually
with Plant Type (a Shrub is inherently Woody) — worth prototyping both ways
before committing to it.

## Excluded from Phase 1

**Watering need — 0.0% (0 of 4,688).** Not a data gap: NC Extension's own
record schema has no watering-frequency field at all. The column was built
for a Perenual import that never happened at scale. Nothing to backfill
without a second data source; `soil_drainage` is the closest available proxy.

**Ecological tags — 99.5% coverage, 700+ distinct raw values.** Excellent
coverage, unmanaged vocabulary. Mixes real traits with internal source codes
and near-duplicates: `NC native` (1,090) / `Native Plant` (406) / `native
perennial` (244) all mean roughly the same thing; `deer resistant` (1,351)
duplicates `deer browsing plant` (184); `HS304`, `ebh-vh`, `ncemgva2018` are
course/event codes, not plant traits. Also surfaced a live scraper bug: the
tag `children&#x27;s garden` has an unescaped HTML entity. This is the most
on-theme facet for a knowledge-focused app (native status, deer resistance,
pollinator value) — recommended as the fast-follow right after Phase 1, once
the raw tags are normalized into a controlled vocabulary of ~15–20 curated
values.

## Open questions for Design

1. How should "not specified" read for lower-coverage facets (Soil pH 72%,
   Attracts 66%) — does an unchecked gap need its own visible option?
2. Twelve facet groups is a lot to show at once — sidebar, drawer, or does
   the mockup's horizontal pill row extend past one facet?
3. Is Life Cycle worth a 13th facet, or does it just restate Plant Type?
4. Do multi-select facets combine as AND or OR across groups (e.g. "Full Sun"
   + "Low Maintenance")?
