# Warga Digital

Ekosistem digital Sawangan Regensi RT 03 - Mobile-first onboarding dan registrasi.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- NextUI
- Framer Motion
- Zustand
- Supabase (database)
- Custom auth (JWT + httpOnly cookies)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-min-32-chars-long
ENCRYPTION_KEY=your-encryption-key-32-bytes-hex
OTP_PROVIDER=mock
```

### 3. Supabase migrations

**Option A: Supabase hosted (recommended)**

1. Create a project at [supabase.com](https://supabase.com)
2. Link your project: `npx supabase link --project-ref YOUR_PROJECT_REF`
3. Run migrations: `npx supabase db push`

**Option B: Local Supabase**

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Start local: `npx supabase start`
3. Migrations run automatically on start

**Option C: Manual**

Run the SQL files in `supabase/migrations/` in order against your Supabase project's SQL editor.

### 4. Development

```bash
npm run dev
```

## Migrations

Migrations are in `supabase/migrations/` with timestamped names:

1. `20260209000001_create_enums.sql` - Enum types
2. `20260209000002_create_core_tables.sql` - Core schema
3. `20260209000003_create_auth_tables.sql` - OTP and sessions
4. `20260209000004_create_indexes.sql` - Indexes
5. `20260209000005_create_rls_policies.sql` - RLS
6. `20260209000006_seed_default_data.sql` - Default tenant, communities, roles
7. `20260209000007_add_wa_number_hash.sql` - WA number lookup column

To create a new migration:

```bash
npx supabase migration new your_migration_name
```

## OTP Provider

Default: **mock** (logs OTP to console).

To use Clawdbot webhook:

1. Set `OTP_PROVIDER=clawdbot`
2. Set `CLAWDBOT_WEBHOOK_URL` to your webhook endpoint
3. Adjust payload in `src/lib/otp/providers/clawdbot.ts` to match your API
