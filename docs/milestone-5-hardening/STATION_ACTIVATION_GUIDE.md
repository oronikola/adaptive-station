# Station Activation Guide

**Milestone:** 5 (IP-006 work item 8)
**Audience:** School IT staff / kiosk installers
**Status:** Ready to use — reflects the actual activation flow built in IP-002–IP-004

## Before You Start

- The station must already exist in Adaptive Station as a `pending_activation` record. A tenant admin creates this via the platform team during onboarding, or it may already exist as a placeholder if it was auto-created during a legacy data import (named `Legacy Station {id}` — rename it to something meaningful for your school before activating).
- You need a tenant_admin (or platform_super_admin) portal login.
- The physical kiosk device must have network access to Adaptive Station's API — it never needs, and must never be given, direct database credentials (per ADR-003).

## Steps

1. **Log in to the portal** and go to **Stations**.
2. Click the station you want to activate (status shows "Pending Activation").
3. Click **Issue Activation Code**. A one-time code is displayed — **write it down now**; it will not be shown again after you navigate away.
4. On the physical kiosk, open its setup/configuration screen and enter the activation code exactly as shown.
5. The kiosk calls `POST /api/v1/device/activate` with the code. On success:
   - The station's status changes to `active` in the portal.
   - The kiosk receives its own long-lived device credential (a bearer token), which it must store securely (per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §5, protected by OS-level credential storage — not a plain-text file).
6. Confirm the station shows as **Online** on the Stations page within a few minutes (based on its first heartbeat).
7. Test a real tap with a known card. Confirm the event appears in **Attendance** search for that station within the expected sync window.
8. If the kiosk will operate offline for extended periods, confirm it downloaded a full master-data cache (people + cards) before disconnecting it from the network for the first time — check the kiosk's own sync-status indicator per its application documentation.

## If Activation Fails

- **"Invalid or already-used activation code"** — activation codes are single-use (`StationActivationCodeSingleUseTest` proves a code cannot be redeemed twice). Issue a new one from the station's detail page.
- **Code expired** — activation codes have a limited validity window. Issue a new one; there's no way to extend an expired code.
- **Station still shows "Pending Activation" after entering the code** — confirm the kiosk actually reached the API (network/firewall issue) before assuming the code itself is wrong.

## After Activation

- The device credential shown at activation is the kiosk's only means of authenticating to Adaptive Station. If it's ever lost, compromised, or the kiosk is being decommissioned, **revoke and reissue** from the station detail page — see `SUPPORT_AND_INCIDENT_RUNBOOK.md`'s "device token may be compromised" playbook.
- Ongoing configuration (display settings, clock format, etc.) is edited from the same station detail page's Configuration section — changes reach the kiosk on its next sync, no re-activation needed.
