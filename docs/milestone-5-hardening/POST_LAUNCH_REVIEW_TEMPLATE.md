# Post-Launch Review Template

**Milestone:** 5 (IP-006 work item 10)
**Status:** Template — fill in after the pilot's staged cutover completes (`PILOT_CUTOVER_EXECUTION_RUNBOOK.md` Phase E)

## Pilot Facts

- Pilot school: `[name]`
- Cutover start date / completion date: `[dates]`
- Number of stations migrated: `[N]`
- Historical data range imported: `[range]`
- Legacy export enabled during transition: `[yes/no]`, disabled on: `[date, if applicable]`

## What Worked

- `[e.g. specific parts of onboarding, import, or activation that went smoothly]`

## Defects Found During Rollout

| Defect | Severity | Root cause | Fixed before/after go-live? |
|---|---|---|---|
| | | | |

## Reconciliation Summary

- Final `import_exceptions` count at sign-off: `[should be 0 open]`
- Legacy vs Adaptive Station attendance count discrepancy, if any, over the parallel-run period: `[details]`
- Any tolerance exceptions granted, and by whom: `[details]`

## Support Load During Transition

- Number of incidents raised (per `SUPPORT_AND_INCIDENT_RUNBOOK.md` severity levels): Sev1 `[N]`, Sev2 `[N]`, Sev3 `[N]`
- Most common incident type: `[e.g. station connectivity, card assignment confusion]`

## Post-MVP Backlog Candidates

Capture anything observed during the pilot that's out of scope for this cutover but worth prioritizing next:

- `[e.g. a UX pain point in the import preview, a reconciliation report gap, a training material gap]`

## Sign-Off

- [ ] School stakeholder has confirmed acceptance of the migrated data and live system.
- [ ] Platform team has retired legacy direct-table dependencies for this school (one-way, per the cutover runbook's rollback plan — only after this checkbox).
- [ ] This document has been shared with the team responsible for the next pilot school's onboarding.
