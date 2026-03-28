# Warga Digital

Ekosistem digital untuk warga Sawangan Regensi RT 03 — **mobile‑first onboarding, registrasi, dan pengelolaan data RT**.

> Built with Next.js 15 and Supabase for modern, fast, and secure neighborhood services.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database & Migrations](#database--migrations)
  - [Local Development](#local-development)
- [OTP Provider](#otp-provider)
- [Project Scripts](#project-scripts)
- [Versioning & Releases](#versioning--releases)
- [Folder Structure](#folder-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Warga Digital is a **digital ecosystem for neighborhood (RT) management**, focused on:

- Mobile‑first onboarding and registration for residents
- Centralized resident and household data
- Operational tools for RT administrators (e.g. cash/`kas RT` management and reporting)
- A modern, secure web experience powered by Supabase and custom JWT auth

The goal is to give RTs a solid foundation to digitalize day‑to‑day administration while staying simple enough for non‑technical operators to use.

---

## Features

- **Mobile‑first onboarding & registration**
  - Designed primarily for mobile browsers
  - Guided flows for new resident onboarding
- **Resident & household management**
  - Centralized data for warga and households
  - Opinionated schema with enums and roles in Supabase
- **RT cash (`Kas RT`) management**
  - Transactions and reporting for RT funds
  - Server‑side APIs for `kas RT` operations
- **Secure authentication**
  - Custom JWT‑based auth with httpOnly cookies
  - OTP provider abstraction for flexible SMS/WhatsApp providers
- **Modern UX**
  - Built with NextUI, Framer Motion, and Zustand
  - App Router support with React 18

> Note: This project is still in early development (`version: 0.1.0`), so APIs and UX may change.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: NextUI, Tailwind CSS, Framer Motion
- **State Management**: Zustand
- **Database & Backend**: Supabase (Postgres + RLS)
- **Auth**: Custom JWT + httpOnly cookies
- **PDF & Utilities**: `pdf-lib`, `uuidv7`

---

## Architecture

- **Frontend**: Next.js App Router pages under `src/app/**`, optimized for mobile usage.
- **Backend**:
  - API routes under `src/app/api/**` (including `kas-rt` endpoints)
  - Supabase as the primary data store with strong RLS policies
  - Custom OTP providers (mock, Clawdbot, etc.) wired into the auth flow
- **Database**:
  - All schema defined via SQL migrations in `supabase/migrations/`
  - Enum types, core tables, auth tables, indexes, and RLS policies
  - Seed data for tenants, communities, and roles

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ (recommended for Next.js 15)
- **npm**: v9+ (comes with Node 20+)
- **Supabase**:
  - Either a hosted Supabase project, or
  - Local Supabase via the Supabase CLI

### Installation

Clone and install dependencies:

```bash
git clone https://github.com/<your-username>/warga-digital.git
cd warga-digital
npm install
```

### Environment Variables

Create a `.env.local` file in the project root and fill in the required values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-min-32-chars-long
ENCRYPTION_KEY=your-encryption-key-32-bytes-hex
OTP_PROVIDER=mock
# Optional, used when OTP_PROVIDER=clawdbot
CLAWDBOT_WEBHOOK_URL=https://your-clawdbot-endpoint

# Optional, used by `npm run db:generate`
SUPABASE_PROJECT_ID=your-supabase-project-id
```

#### Environment variable reference

| Name                       | Required | Description                                                                 |
| -------------------------- | :------: | --------------------------------------------------------------------------- |
| `SUPABASE_URL`            |   Yes    | Supabase project URL.                                                       |
| `SUPABASE_SERVICE_ROLE_KEY` |  Yes  | Service role key used on the server side (never expose on the client).     |
| `JWT_SECRET`              |   Yes    | Secret for signing and verifying JWTs (minimum 32 characters).             |
| `ENCRYPTION_KEY`          |   Yes    | 32‑byte encryption key (hex) for sensitive data.                           |
| `OTP_PROVIDER`            |   Yes    | OTP provider (`mock` or `clawdbot`).                                       |
| `CLAWDBOT_WEBHOOK_URL`    |   No     | Webhook URL for Clawdbot when using `OTP_PROVIDER=clawdbot`.               |
| `SUPABASE_PROJECT_ID`     |   No     | Used by the `db:generate` script to generate TypeScript types.             |

### Database & Migrations

All migrations live in `supabase/migrations/` with timestamped names:

1. `20260209000001_create_enums.sql` — Enum types
2. `20260209000002_create_core_tables.sql` — Core schema
3. `20260209000003_create_auth_tables.sql` — OTP and sessions
4. `20260209000004_create_indexes.sql` — Indexes
5. `20260209000005_create_rls_policies.sql` — RLS policies
6. `20260209000006_seed_default_data.sql` — Default tenant, communities, roles
7. `20260209000007_add_wa_number_hash.sql` — WA number lookup column

You have a few options for applying migrations:

**Option A: Hosted Supabase (recommended)**

1. Create a project at [Supabase](https://supabase.com).
2. Link your project:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Push migrations:

   ```bash
   npx supabase db push
   ```

**Option B: Local Supabase**

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Start local Supabase:

   ```bash
   npx supabase start
   ```

3. Migrations are automatically applied on start.

**Option C: Manual SQL**

Run the SQL files in `supabase/migrations/` in order using the Supabase SQL editor.

To create a new migration:

```bash
npx supabase migration new your_migration_name
```

### Local Development

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

Build for production:

```bash
npm run build
```

Run the production build locally:

```bash
npm start
```

Run linting:

```bash
npm run lint
```

---

## OTP Provider

Warga Digital uses an OTP provider abstraction so you can swap the implementation without changing the core auth flow.

- **Default**: `mock` — logs OTPs to the server console (useful for local development).
- **Clawdbot**: `clawdbot` — sends OTPs via a Clawdbot webhook.

To use Clawdbot:

1. Set `OTP_PROVIDER=clawdbot` in `.env.local`.
2. Set `CLAWDBOT_WEBHOOK_URL` to your webhook endpoint.
3. Adjust the payload in `src/lib/otp/providers/clawdbot.ts` to match your API contract.

---

## Project Scripts

Available npm scripts (from `package.json`):

- **`npm run dev`**: Start the Next.js dev server (with Turbopack).
- **`npm run build`**: Build the production bundle.
- **`npm start`**: Run the production server.
- **`npm run lint`**: Run ESLint using the Next.js config.
- **`npm run db:generate`**: Generate TypeScript types from the Supabase schema into `src/types/database.generated.ts`.

---

## Versioning & Releases

This project uses **Semantic Versioning** ([semver.org](https://semver.org/)) to manage releases.

### Current Version

```bash
npm run version:info
```

View the [`VERSION`](./VERSION) file for the current version number.

### Version Management Commands

```bash
# Check version info and git status
npm run version:info

# Bump version (automatically updates VERSION and package.json)
npm run version:patch       # Bug fixes (0.1.0 → 0.1.1)
npm run version:minor       # New features (0.1.0 → 0.2.0)
npm run version:major       # Breaking changes (0.1.0 → 1.0.0)

# Prepare a release
npm run version:prepare [major|minor|patch]
```

### Making a Release

1. **Update** [`CHANGELOG.md`](./CHANGELOG.md) with your changes
2. **Bump** the version: `npm run version:patch` (or minor/major)
3. **Commit**: `git commit -am "chore: release vX.Y.Z"`
4. **Tag**: `git tag vX.Y.Z`
5. **Push**: `git push origin main --tags`
6. **Create** a GitHub Release from the tag

### Documentation

- **Complete Guide**: See [`VERSIONING.md`](./VERSIONING.md)
- **Quick Reference**: See [`VERSIONING_QUICK_REFERENCE.md`](./VERSIONING_QUICK_REFERENCE.md)
- **Change History**: See [`CHANGELOG.md`](./CHANGELOG.md)

---

## Folder Structure

High‑level structure (non‑exhaustive):

```text
src/
  app/                 # Next.js App Router pages & API routes
    api/               # Backend endpoints (e.g. kas RT)
  lib/                 # Shared libraries (auth, OTP providers, utils, etc.)
  types/               # Generated and shared TypeScript types
supabase/
  migrations/          # All SQL migrations defining the database schema
  scripts/             # Helper SQL scripts (e.g. maintenance, utilities)
```

---

## Deployment

You can deploy Warga Digital like any other Next.js 15 application.

Typical options:

- **Vercel**: Connect your GitHub repo, set environment variables in the Vercel dashboard, and deploy.
- **Custom hosting**: Build with `npm run build` and run `npm start` behind your own reverse proxy (NGINX, Caddy, etc.).

Make sure all environment variables from the [Environment Variables](#environment-variables) section are set in your hosting environment.

---

## Contributing

Contributions, ideas, and feedback are welcome — especially from RT administrators and residents who will use tools like this in real life.

1. Fork the repository.
2. Create a topic branch: `git checkout -b feature/my-feature`.
3. Make your changes and add tests (if applicable).
4. Run `npm run lint` and ensure there are no errors.
5. Open a pull request with a clear description of your changes and motivation.

---

## License

No explicit license is currently defined for this project.  
If you plan to open‑source it, consider adding a `LICENSE` file (e.g. MIT, Apache‑2.0) and updating this section accordingly.

