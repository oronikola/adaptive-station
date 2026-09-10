---
target_identity: "file:C:\\laragon\\www\\adaptive-station\\resources\\js\\Pages\\Admin"
timestamp: 2026-09-10T07-09-10Z
slug: resources-js-pages-admin
---
⚠️ DEGRADED: single-context (rate limit — both sub-agents hit API rate ceiling at spawn time)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading states added; but no aria-live for filter results; import batches don't auto-poll |
| 2 | Match System / Real World | 3 | "Tap" is natural; "RFID card UID" may confuse registrars |
| 3 | User Control and Freedom | 3 | Cancel everywhere; modals have escape; no undo for import submit |
| 4 | Consistency and Standards | 3 | pf-* highly consistent; pf-modal as form wrapper in integrations-create is an outlier |
| 5 | Error Prevention | 3 | Deactivation/revocation confirmations solid; JSON config field has no schema guard |
| 6 | Recognition Rather Than Recall | 2 | No breadcrumbs on detail pages; activity feed shows snake_case-derived strings |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts, no bulk actions, no column sorting, no quick-add from lists |
| 8 | Aesthetic and Minimalist Design | 3 | Tables clean; hero on every page adds ~120px overhead before data |
| 9 | Error Recovery | 2 | InputError present; import exception list has no inline fix path; JSON config errors generic |
| 10 | Help and Documentation | 1 | No tooltips; JSON integration config has no schema hint; CSV import has no column guide |
| **Total** | | **24/40** | **Acceptable** |

## Priority Issues

**[P1] No efficiency path for the daily operator** — no column sorting, no keyboard shortcuts, no bulk actions. Same friction on day 500 as day 1. Fix: sortable column headers, `/` to focus search, bulk checkbox for people list. `/impeccable shape`

**[P1] Integration config and CSV import have no guardrails** — raw JSON textarea with no schema hint, no column guide for CSV. Fix: pf-field-hint blocks showing expected shape. `/impeccable clarify`

**[P2] Hero section structural overhead on every screen** — ~120px before first data row on every list page. Fix: single-line header on list screens, full hero only on dashboard/create/edit. `/impeccable layout`

**[P2] 8-column Stations table unreadable under 1280px** — App Version + Pending Events share weight with Name/Status. Fix: collapse to 5 visible columns, move detail to expandable row. `/impeccable layout`

**[P2] No breadcrumbs on detail pages** — people-edit, station-detail, imports-show. Fix: nav aria-label="Breadcrumb" above hero. `/impeccable adapt`

## Persona Red Flags

**Alex (Registrar, daily)**: No keyboard shortcut to focus search. No column sort on People/RFID. Cannot see RFID status from list.

**Jordan (IT setup)**: Raw JSON textarea in integrations with no schema guide. Will break silently.

**Sam (Screen reader)**: Duplicate htmlFor="guardian_name" in people-edit. Missing aria-live on filter completion. rfid-cards filter form missing role="search".
