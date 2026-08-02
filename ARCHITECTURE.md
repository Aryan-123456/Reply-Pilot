# Reply Pilot Architecture

## Purpose and boundaries

Reply Pilot is a single-workspace, single-location MVP for drafting and optionally posting replies to Google Business Profile reviews. It uses Next.js route handlers and server actions, Supabase Auth, Prisma/PostgreSQL, OpenAI, and Vercel Cron. Billing, notifications, analytics, agency controls, and multi-location selection are deliberately outside the MVP.

## Folder structure

| Path | Responsibility |
| --- | --- |
| `app/(auth)` | Login and registration pages. |
| `app/(dashboard)` | Protected server-rendered dashboard, reviews, and settings pages. |
| `app/actions` | Zod-validated, authenticated mutations invoked by the UI. |
| `app/api/google` | OAuth start and callback handlers. |
| `app/api/cron` | Private scheduled synchronization entry point. |
| `components` | Reusable client UI only where interaction requires it. |
| `lib` | Authentication, Prisma, encryption, Google, and third-party integration boundaries. |
| `lib/services` | Domain operations: sync, generate reply, post reply. |
| `prisma` | Data schema and migrations. |

## Database schema

Supabase owns identities in `auth.users`; Prisma's `User.id` mirrors that UUID. A user belongs to an `Organization` through `OrganizationMember`. Every Google account, location, review, reply, and brand voice is reached through that organization.

`GoogleAccount` stores only encrypted OAuth tokens and a token expiry. `Location` is the connected Google resource name (`accounts/{account}/locations/{location}`), which avoids ambiguous constructed IDs. `Review.googleReviewId` is unique for idempotent ingestion. `ReviewReply` records drafts and publication outcomes; `POSTING` acts as a claim state so concurrent requests cannot post the same reply twice. `SyncLog` records each background run.

Create migrations with `npm run db:migrate` after configuring `DATABASE_URL` and `DIRECT_URL`; never run schema changes directly against production without reviewing the generated migration.

## Authentication and tenant authorization

Middleware refreshes Supabase sessions and sends unauthenticated dashboard requests to `/login`. Server pages and server actions call `requireUser` or `requireOrganization`; `requireUser` upserts the minimal local user record after obtaining the verified Supabase user. Server actions scope every location, review, and reply lookup through the active organization. Route handlers that operate on a workspace validate membership with `verifyOrgAccess`.

The database should also enforce Supabase Row Level Security for any client-exposed tables. This application uses Prisma only on the server, but RLS is defense in depth, not a replacement for server-side checks.

## Google Business integration and OAuth lifecycle

1. A signed-in workspace starts `/api/google/connect`.
2. The route generates a cryptographically random state and writes the state plus organization payload to a short-lived, HTTP-only, same-site cookie.
3. Google redirects to `/api/google/callback`. The callback requires the matching state cookie, verifies the current Supabase session is a member of the payload organization, then exchanges the authorization code.
4. Access and refresh tokens are encrypted with AES-256-GCM before persistence. `TOKEN_ENCRYPTION_KEY` is mandatory; plaintext and fallback encryption keys are rejected.
5. The app discovers accessible accounts through the Account Management API and locations through the Business Information API. The Settings screen presents the server-discovered locations and a server action verifies the chosen resource against Google before persisting it. The MVP permits one selected location per workspace; do not accept arbitrary Google resource names from the client.
6. Before any Google call, `getValidGoogleAccessToken` refreshes access tokens within a five-minute expiry window and writes the newly encrypted token.

Google's account-management and business-information APIs replace deprecated account/location management endpoints. The review operations remain on the Google My Business v4 review API, which Google documents separately for listing and replying to reviews.

## AI prompt strategy

`generateReviewReply` obtains the review and its organization-scoped location settings server-side. The system message includes only business name, configured voice, language, and target length. The user message contains the reviewer name, rating, and review content. This keeps settings as instructions and review content as untrusted input. The generated result is stored as a `DRAFT`; no model failure creates a fabricated reply. The requested model is passed unchanged from `OPENAI_MODEL` or the location setting, so deployments must configure a model actually available to that API key.

Future improvement: use structured output with a schema and add moderation/escaping policy if user-generated content is shown outside the trusted dashboard.

## Cron and synchronization

Vercel invokes `GET /api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`. The endpoint fails closed when `CRON_SECRET` is missing and never accepts a secret in the query string. It iterates connected locations, then each sync:

1. refreshes Google access if needed;
2. fetches reviews;
3. upserts by `googleReviewId`;
4. records a `SyncLog` success or failure;
5. only for `autoReply` locations with no Google reply, creates a draft and claims/posts it.

Vercel Cron configuration belongs in `vercel.json` when scheduling is enabled, for example `{ "crons": [{ "path": "/api/cron/sync", "schedule": "0 * * * *" }] }`. Configure the same `CRON_SECRET` in Vercel and the scheduler request configuration.

## Security model

- Secrets are server-only environment variables and `.env` is ignored.
- Google tokens use authenticated encryption with a random 96-bit IV; decryption failures stop processing and require reconnection.
- OAuth is protected from CSRF by an unpredictable state bound to an HTTP-only cookie, with a ten-minute lifetime.
- User-supplied IDs and settings are validated with Zod and scoped through the organization relation.
- Reply publication uses an atomic `DRAFT -> POSTING` claim to prevent duplicate posts.
- Provider errors are logged server-side; route redirects and cron responses do not expose token/provider details.
- Use a managed secret store, rotate `TOKEN_ENCRYPTION_KEY` through a planned re-encryption migration, and do not place secrets in browser-visible variables.

## Deployment architecture

Deploy the Next.js application to Vercel and Prisma's PostgreSQL connection to Supabase. Use Supabase's pooler URL for `DATABASE_URL` and a direct URL for `DIRECT_URL` migrations. Set all values from `.env.example` in Vercel project environment settings; production must use a stable public `GOOGLE_OAUTH_REDIRECT_URI` registered in Google Cloud. Create the Prisma migration, apply it to Supabase, and enable the required Google APIs and OAuth consent screen before enabling the cron job.

Run `npm run build` before deploying. Production monitoring should alert on failed `SyncLog` records and Google token refresh failures.
