# AI Maintenance Notes

## Goals
- Keep changes small and localized.
- Prefer extending existing patterns over adding new ones.
- Avoid introducing new dependencies.

## File map
- `MauiApp/`: .NET MAUI host app (HybridWebView).
- `MauiApp/Resources/Raw/wwwroot/`: packaged web assets.
- `index.html`: web entry (source copy).
- `styles.css`: layout, markers, modal, and picker styles.
- `js/main.js`: state, rendering, persistence, and modal logic.
- `js/constants.js`: UI labels and storage key.
- `js/dateUtils.js`: date helpers.
- `js/storage.js`: storage + normalization.
- `AI_MANIFEST.json`: canonical schema + invariants.

## State + invariants (must hold)
- Events are stored in LocalStorage under `event-loom-events`.
- Blackout dates are stored in LocalStorage under `event-loom-blackouts`.
- Each event has a shared title and an array of `dates` entries.
- Each date entry has vendor/performer status fields using the expanded tag set.
- Multiple events can share the same date, but only one can be confirmed per date.

## Editing rules
- Keep date formatting in local time via `toLocalISO()`.
- When adding features, prefer pure helpers over inline logic.
- Update `AI_MANIFEST.json` if schema changes.
