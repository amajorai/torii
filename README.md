# Tauri Desktop App Boilerplate

A production-ready Tauri v2 + React 19 desktop app shell with licensing, analytics, auto-updates, and secure storage baked in.

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, Vite
- **Backend**: Tauri v2 (Rust), SQLite via plugin-sql
- **Licensing**: Polar (license key validation with offline cache)
- **Analytics**: PostHog + optional Axiom log shipping
- **Updates**: GitHub Releases auto-updater with license expiry gate
- **Storage**: AES-256-GCM encrypted key-value store (Rust), Tauri plugin-store (JSON)

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

## Getting started

```bash
bun install
cp .env.example .env
# fill in .env values (see Configuration below)
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Tauri dev (hot reload) |
| `bun run vite:dev` | Frontend only (no Tauri) |
| `bun run desktop:build` | Production Tauri build |
| `bun run typecheck` | TypeScript check |

## Configuration

Copy `.env.example` to `.env` and fill in:

```
VITE_POLAR_API_URL          # https://api.polar.sh (or sandbox)
VITE_POLAR_ORGANIZATION_ID  # from polar.sh dashboard
VITE_POLAR_ORG_SLUG         # your org slug
VITE_POLAR_CUSTOMER_PORTAL_URL
VITE_POLAR_PURCHASE_URL     # your product page
VITE_POLAR_SERVER_URL       # your Hono/API server URL

VITE_AXIOM_TOKEN            # optional, for log shipping
VITE_AXIOM_DATASET          # optional

VITE_POSTHOG_KEY            # optional, for analytics
VITE_POSTHOG_HOST           # optional
```

## Renaming the app

Three places to update:

1. `src-tauri/Cargo.toml` — `name` and `[lib] name`
2. `src-tauri/tauri.conf.json` — `productName`, `identifier`, window `title`
3. `package.json` — `name`

## Auto-updater setup

The updater pulls from a GitHub Releases endpoint. After renaming:

1. Set `endpoints` in `tauri.conf.json` to your repo's release URL
2. Generate a keypair: `bun tauri signer generate`
3. Put the public key in `tauri.conf.json` under `plugins.updater.pubkey`
4. Set the private key as `TAURI_SIGNING_PRIVATE_KEY` in your CI environment

## Project structure

```
src/
  App.tsx                  # Root: license gate, page routing, shell
  components/
    TitleBar.tsx           # Custom window chrome (draggable, close/min/max)
    SettingsPage.tsx       # General / License / Storage / Updates / Privacy tabs
    LicenseActivation.tsx  # Polar license key entry
    VersionGateModal.tsx   # Blocks launch when running past license expiry
    CustomerPortalDialog.tsx
  stores/
    use-app-settings-store.ts  # Theme, autostart, update prefs, analytics toggle
    use-license-store.ts       # Polar validation, offline cache, device activation
  hooks/
    use-app-updater.ts     # GitHub releases check + license expiry gate
    use-window-bounds.ts   # Persist/restore window size and position
    use-polar-checkout.ts  # Embedded Polar checkout
  lib/
    db.ts                  # SQLite migration pipeline (add tables here)
    polar-config.ts        # Polar env var config
    posthog.ts             # Analytics init
    logger.ts              # Pino + optional Axiom transport
    schema-migration.ts    # JSON file versioning pipeline
    secure-storage.ts      # Wrappers for Rust AES-256-GCM commands
src-tauri/src/
  lib.rs                   # Tauri plugins, window setup, command registration
  secure_storage.rs        # AES-256-GCM encrypted key-value store
```

## Adding features

### Add a page
1. Extend the `Page` type in `App.tsx`
2. Add a route in the `App` render
3. Add navigation (e.g., a button in TitleBar `actions`)

### Add a database table
Add a migration in `src/lib/db.ts`. Bump `TARGET_SCHEMA_VERSION` and add a migration function. The pipeline runs automatically on startup.

### Add a secure stored value
Call the Tauri commands via the wrappers in `src/lib/secure-storage.ts` (or add wrappers following the same pattern). Data is encrypted with AES-256-GCM keyed to the device.

### Add settings
Add fields to `use-app-settings-store.ts`. The store auto-persists to Tauri plugin-store on every setter call.
