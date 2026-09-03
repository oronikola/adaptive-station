# ADR-002 — Retain the Existing WPF Kiosk for the MVP

**Date:** 2026-09-02
**Status:** Accepted

## Context

The live RFID Tapping System is a .NET 8 WPF, Windows x64, fullscreen kiosk application with a working keyboard-wedge RFID input path, local SQLite persistence, duplicate protection, IN/OUT logic, and ad slideshow/display customization (`docs/master/SYSTEM_ARCHITECTURE.md`, `docs/master/TECHNICAL_DOCUMENTATION.md`). Adaptive Station's MVP goal requires local-first offline tapping to keep working exactly as it does today, while adding cloud multi-tenancy. A rewrite of the kiosk in a different runtime (Electron, a web-based kiosk, a new native client) was considered as an alternative to modifying the existing app.

## Decision

The MVP keeps the existing .NET 8 WPF codebase as the kiosk application and changes only its remote-connectivity layer: direct `MySqlConnector` reads/writes are replaced with calls to the Adaptive Station HTTPS API (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §4 "Kiosk implementation decision", IP-003).

## Consequences

- The already-proven local-first tap path, duplicate-window logic, IN/OUT state logic, and keyboard-wedge input handling are preserved without behavioral risk, satisfying the MVP requirement that a valid scan never depends on a network request.
- Kiosk changes for the MVP are scoped to `RfidTappingSystem.Services` (specifically replacing `RemoteDbSyncClient`'s direct MySQL calls with an `AdaptiveStationApiClient`) and to the local SQLite schema (adding sync-status/cursor fields per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §5), not a UI or platform rewrite.
- The kiosk remains Windows-only and desktop-only for the MVP; native mobile kiosk apps stay explicitly deferred (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §3, §15).
- Any future kiosk platform change is a separate, deliberately-scoped decision, not something the MVP milestones assume.
