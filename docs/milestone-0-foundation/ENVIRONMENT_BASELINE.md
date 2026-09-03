# Development, Staging, and Production Environment Baseline

**Milestone:** 0 (IP-001 work item 8)
**Status:** Approved baseline; CI workflow wiring is a proposed next step, not yet implemented
**Sources:** repository root (`composer.json`, `package.json`, `.env.example`, `phpunit.xml`, `.gitignore`), `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §4/§11, `ADAPTIVE_STATION_DATABASE_DESIGN.md` §9

## What Is Already Scaffolded

- **Backend:** Laravel 13 (`composer.json`), PHP `^8.3`, with `inertiajs/inertia-laravel`, `laravel/sanctum` (for device/API token auth), `tightenco/ziggy` already required — matching the stack in `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §4.
- **Frontend:** Inertia + React 18 + Tailwind CSS 3, built with Vite (`package.json`) — matches the portal stack requirement.
- **Testing:** PHPUnit 12 configured with separate `Unit`/`Feature` suites (`phpunit.xml`), running against an in-memory SQLite database (`DB_DATABASE=:memory:`) with `QUEUE_CONNECTION=sync` and array session/cache/mail drivers for fast, isolated test runs.
- **Local development database:** SQLite (`.env.example` → `DB_CONNECTION=sqlite`), suitable for early local development before a real MySQL instance is wired up, but **not** representative of the target production engine (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §2 requires MySQL 8.0+, InnoDB, `utf8mb4`).
- **Secrets hygiene:** `.gitignore` already excludes `.env`, `.env.backup`, `.env.production`, `auth.json`, and `storage/*.key` — no committed-secret risk from the current scaffold.
- **Laravel Boost** (`laravel/boost` dev dependency) is present per `AGENTS.md`'s bootstrap instructions; run `php artisan boost:install` before further backend work if not already done, so `AGENTS.md` reflects app-specific guidance instead of the generic bootstrap text.

## Required Environment Variable Groups Per Environment

| Variable group | Local | Staging | Production |
|---|---|---|---|
| `APP_ENV` / `APP_DEBUG` | `local` / `true` | `staging` / `false` | `production` / `false` |
| `DB_CONNECTION` | `sqlite` (acceptable for early scaffolding only) | `mysql` | `mysql` |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | n/a while on SQLite | Required — staging MySQL 8 instance, `utf8mb4` | Required — production MySQL 8 instance, `utf8mb4`, credentials from a secret manager, never committed |
| `QUEUE_CONNECTION` | `database` (scaffold default) or `sync` | `redis` (preferred per `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §4) | `redis` |
| `SESSION_DRIVER` / `CACHE_STORE` | `database` (scaffold default) | `redis` recommended | `redis` recommended |
| Integration-credential encryption | Laravel `APP_KEY` (already used for `encrypt()`) | Same, per-environment unique key | Same, per-environment unique key, rotated per incident-response policy |
| Device/station credential hashing | No separate secret needed — hashes stored in DB (`station_credentials.token_hash`) | Same | Same |
| Mail | `log` driver (scaffold default) — fine until notifications are implemented | Real transactional mail provider if platform notifications are enabled | Real transactional mail provider |

Each non-local environment must set its own `APP_KEY`; never reuse a local/staging key in production.

## Secret-Handling Rules

- `.env` is never committed (already enforced by `.gitignore`); production secrets are provisioned through the deployment environment, not checked into the repository.
- Integration credentials (`integration_profiles.config_encrypted`) are encrypted at rest using Laravel's encryption facilities and are only ever decrypted by server-side queue workers — never returned to portal clients or kiosks (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §8, [ADR-003](../adr/ADR-003_api-only-kiosk-cloud-communication.md)).
- Device tokens and station activation codes are stored only as hashes (`token_hash`, `code_hash`); raw values are shown once at creation and never persisted in plaintext (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.2).
- The seeded default `admin/admin123` account from the legacy system (`TECHNICAL_DOCUMENTATION.md`) must never carry over — Adaptive Station requires a forced password change during first-run provisioning (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §11).

## Logging and Backup Expectations

- Application logging uses Laravel's standard `LOG_CHANNEL=stack` (already the scaffold default); production should route to a centralized log destination rather than local files only, before Milestone 6 go-live.
- `audit_logs` (logins, station registration, role changes, card changes, integration runs, administrative changes) is an application-level durability requirement, not just infrastructure logging — see `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §11.
- MySQL must be backed up regularly with tested restore procedures; kiosk SQLite requires a documented export/backup procedure before any reset, hardware replacement, or major troubleshooting action (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §9). Concrete backup tooling/schedule is finalized during Milestone 6 (IP-006) production-readiness work, not required to start Milestone 1.

## Proposed Next Step (Not Yet Implemented)

No CI workflow exists in the repository yet. A minimal CI pipeline is recommended before Milestone 2 (device API) work merges, running at minimum:

```text
composer install
composer test        # runs php artisan test against the in-memory SQLite suite
vendor/bin/pint --test
npm install
npm run build
```

This is scoped as an implementation task (e.g. a `.github/workflows/ci.yml`), not a documentation deliverable, and is intentionally left out of this Milestone 0 documentation pass.
