# ADR-003 — API-Only Kiosk-to-Cloud Communication

**Date:** 2026-09-02
**Status:** Accepted

## Context

The live system connects kiosks directly to MySQL using `MySqlConnector`, with per-school connection settings (host, port, credentials) stored and used on the kiosk machine itself (`docs/master/TECHNICAL_DOCUMENTATION.md` "Remote Database Configuration"). This requires exposing MySQL to kiosk machines' networks and distributing database credentials to every device, which is incompatible with a multi-tenant cloud platform: a compromised or misconfigured kiosk with direct MySQL access could read or corrupt another tenant's data, and MySQL ports would need to be reachable from school networks generally.

## Decision

Kiosks never receive direct MySQL credentials and never connect to MySQL. All kiosk-to-cloud communication happens exclusively over an authenticated HTTPS JSON API exposed by Adaptive Station Cloud (Laravel): `POST /api/v1/device/session`, `POST /api/v1/device/events/batch`, `GET /api/v1/device/master-data`, `POST /api/v1/device/heartbeat`, `GET /api/v1/device/config` (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §5 principle 2, §10). A kiosk's tenant is always resolved server-side from its authenticated station credential, never trusted from a client-supplied value.

## Consequences

- MySQL is never exposed to the public internet or to kiosk networks; only the Laravel application server needs database connectivity.
- Every device capability (event upload, master-data pull, config, heartbeat) must be deliberately implemented as an API endpoint before the kiosk can use it — there is no fallback direct-query escape hatch.
- Station authentication (activation codes, hashed rotatable tokens) becomes a required piece of infrastructure before any kiosk can sync, tracked in IP-002/IP-003.
- This removes the `SslMode=None` workaround needed for direct MySQL TLS issues (`TECHNICAL_DOCUMENTATION.md` "Troubleshooting"); HTTPS certificate handling is centralized at the Laravel/API layer instead of per kiosk-to-database connection.
