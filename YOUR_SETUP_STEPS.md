# Reply Pilot: Your Setup Checklist

Complete these steps in order. Do not paste any secret into source code, chat, screenshots, or commit history.

## 1. Use Node 22 LTS locally

This workspace currently runs Node 26, which caused an operating-system memory error while starting the TypeScript test runner. Install Node 22 LTS, open a new terminal in this project, then verify it:

```powershell
node --version
npm --version
```

The Node version should start with `v22`.

## 2. Create or open your Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a project, or open your existing project.
2. Save the project URL and publishable/anon key from **Project Settings → API**.
3. Click **Connect** in the project dashboard and copy both connection strings:
   - **Transaction pooler** (port `6543`) for `DATABASE_URL`.
   - **Direct connection** (normally port `5432`) for `DIRECT_URL`.
4. If the transaction-pooler URL does not already contain them, add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.

Edit your local `.env` and replace the local PostgreSQL values:

```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. It must never appear in client components or variables beginning with `NEXT_PUBLIC_`.

## 3. Apply the database migration

The initial migration is already committed at `prisma/migrations/20260801120000_init/migration.sql`.

After setting valid Supabase database URLs, run:

```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma validate
```

Then open Supabase **Table Editor** and confirm these tables exist: `User`, `Organization`, `OrganizationMember`, `GoogleAccount`, `Location`, `BrandVoice`, `Review`, `ReviewReply`, and `SyncLog`.

Do not use `prisma db push` for the production database.

## 4. Configure Supabase Auth

1. In **Authentication → Providers**, enable **Email**.
2. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` for local development.
   - Additional Redirect URL: `http://localhost:3000/auth/callback`.
3. Before production, replace/add:
   - Site URL: `https://YOUR_DOMAIN`
   - Additional Redirect URL: `https://YOUR_DOMAIN/auth/callback`
4. Decide whether email confirmation is required in **Authentication → Providers → Email**. Keep it enabled for production.

## 5. Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a dedicated project for Reply Pilot.
3. Configure the **OAuth consent screen**:
   - Choose the appropriate user type for your business.
   - Add your support email and application details.
   - Add the `business.manage` scope when Google permits it.
   - While testing, add every testing Google account as a test user.
4. Enable the required Google Business Profile APIs and request access/quota approval if Google requires it.
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
6. Add these authorized redirect URIs:

```text
http://localhost:3000/api/google/callback
https://YOUR_DOMAIN/api/google/callback
```

7. Copy the client ID and client secret into `.env`:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/google/callback"
```

For production, change `GOOGLE_OAUTH_REDIRECT_URI` to `https://YOUR_DOMAIN/api/google/callback`.

## 6. Configure OpenAI

1. Create a server-side API key in the [OpenAI API platform](https://platform.openai.com/api-keys).
2. Add it locally:

```env
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
OPENAI_MODEL="YOUR_AVAILABLE_MODEL_ID"
```

3. Confirm that `OPENAI_MODEL` is a model available to your OpenAI project. The app now uses that value exactly; it does not silently substitute another model.

## 7. Generate production secrets

Run these commands locally and copy each resulting value into `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set them as:

```env
TOKEN_ENCRYPTION_KEY="FIRST_VALUE"
CRON_SECRET="SECOND_VALUE"
```

Do not rotate `TOKEN_ENCRYPTION_KEY` casually: existing Google tokens cannot be decrypted after a rotation unless you perform a planned re-encryption migration.

## 8. Test locally

From the project directory:

```powershell
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:3000`, then test this sequence:

1. Register a new account and confirm email, if enabled.
2. Name the workspace.
3. Open Settings and connect Google.
4. Choose a discovered Google Business location.
5. Open Reviews and run a manual sync.
6. Generate a reply, edit it, and post it only to a safe test review.
7. Enable auto-reply only after manual posting is confirmed.

## 9. Deploy to Vercel

1. Push this project to a private Git repository.
2. Import that repository into [Vercel](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add every variable from `.env.example` using production values. Add them to Production, Preview, and Development only as appropriate.
4. Set these production URL values:

```env
GOOGLE_OAUTH_REDIRECT_URI="https://YOUR_DOMAIN/api/google/callback"
```

5. Deploy.
6. Add `https://YOUR_DOMAIN/auth/callback` to Supabase Auth redirect URLs and `https://YOUR_DOMAIN/api/google/callback` to Google OAuth redirect URIs.
7. Confirm `vercel.json` is included in the deployment. It schedules the hourly `/api/cron/sync` job.
8. In Vercel logs, confirm the cron request succeeds. The endpoint requires `Authorization: Bearer <CRON_SECRET>` and fails closed if the secret is absent.

## 10. Final production verification

Before enabling auto-reply, verify:

- A non-owner account cannot open another organization’s reviews by changing IDs.
- A disconnected/expired Google account produces a safe error rather than fake data.
- A failed Google post remains `FAILED`; it is never shown as posted.
- Repeated clicks do not create duplicate Google replies.
- Cron logs show successful syncs for the selected location.
- No `.env` file or secrets are committed to Git.

## If something fails

- **Prisma P1000 authentication failure:** re-copy the Supabase connection strings from **Connect** and URL-encode special characters in the database password.
- **Google redirects with `oauth_failed`:** verify the callback URI is character-for-character identical in Google Cloud, `.env`, and Vercel.
- **No locations appear:** use a Google account that manages a verified Business Profile and ensure the required APIs/access approval are active.
- **OpenAI generation fails:** verify `OPENAI_API_KEY`, billing/project access, and the exact `OPENAI_MODEL` value.
