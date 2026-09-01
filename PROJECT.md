# Project: OVQA PrepPulse Cross-Device Persistence & Mock Purge

## Architecture
- **Framework**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Database**: Supabase PostgreSQL with tables `modules`, `questions`, `test_sessions`, `profiles`.
- **Database Client**: Supabase Service Role Admin Client (`lib/supabase/admin.ts`) using `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (error 42501) on server route handlers.
- **API Layer**:
  - `/api/modules` (GET, POST, DELETE): Administrative and public module endpoints using Service Role client.
  - `/api/modules/[moduleId]` (GET): Single module lookup endpoint using Service Role client.
  - Strict error propagation: No silent swallowing of DB errors, no fallback in-memory caching.
- **Frontend / UI Layer**:
  - `/` (Learner Catalog): Real-time fetching from `GET /api/modules`. When 0 modules exist, renders clean "No modules uploaded yet" empty state with a link to `/admin`.
  - `/quiz/[moduleId]` & `/exam/[moduleId]`: Real-time module loader. Renders explicit "Module Not Found" 404 UI if moduleId is not in Supabase.
  - `/admin`: Direct server mutations against `/api/modules` for JSON upload, editor, and deletion. Evicts local cache on deletion.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Supabase Service Role Admin Client | Instantiate admin client using `SUPABASE_SERVICE_ROLE_KEY` in `lib/supabase/admin.ts` to bypass RLS policies. | M1 | R1 |
| 2 | Persistent `POST /api/modules` | Insert uploaded modules & questions directly into Supabase PostgreSQL, returning HTTP 201 on success or explicit HTTP 4xx/5xx on error with zero in-memory swallowing. | M1 | R1 |
| 3 | Real-Data `GET /api/modules` | Query Supabase `modules` table directly, returning only persisted modules (empty array if 0 modules exist) with zero mock pre-population. | M1 | R1, R2 |
| 4 | Persistent `DELETE /api/modules` | Delete module and cascading questions directly from Supabase PostgreSQL using admin client. | M1 | R1, R3 |
| 5 | Real-Data `GET /api/modules/[moduleId]` | Query Supabase for exact `moduleId`, returning 404 if not found with zero demo module substitution. | M1 | R1, R2 |
| 6 | Purge Mock Data from Catalog & Admin | Remove all imports and usages of `ALL_DEMO_MODULES`, `DEMO_QUIZ_MODULE`, `DEMO_EXAM_MODULE` from `app/page.tsx` and `app/admin/page.tsx`. | M2 | R2 |
| 7 | Catalog Clean Empty State | Display "No modules uploaded yet" with an admin upload link when Supabase has 0 modules. | M2 | R2 |
| 8 | Player 404 Screen | Display "Module Not Found" 404 screen on `/quiz/[moduleId]` and `/exam/[moduleId]` when module ID does not exist in Supabase. | M2 | R2 |
| 9 | Results Session Fallback Purge | Remove demo module fallbacks from `/results/[sessionId]`. | M2 | R2 |
| 10 | Admin Direct Publishing & Feedback | Admin portal (`/admin`) performs direct server mutations against `/api/modules` with immediate success/error alert banners. | M3 | R3 |
| 11 | Admin Deletion & Client Cache Eviction | Deleting module in `/admin` removes it from Supabase and purges local storage caches (`preppulse_local_modules`, sessions). | M3 | R3 |
| 12 | Test Suite Real-Data Assertions | Update unit and E2E test assertions to assert clean empty states and real-data flows instead of expecting hardcoded demo modules. | M1, M2, M3 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Supabase Service Role Persistence & API Layer | Create `lib/supabase/admin.ts`, update `/api/modules` and `/api/modules/[moduleId]` to use admin client, enforce explicit HTTP errors, eliminate `inMemoryPublicModules`. | none | PLANNED |
| 2 | M2: Mock Data Purge, 404 Error Screens & Empty Catalog State | Remove all mock/demo imports in learner catalog and player routes. Implement 404 UI for invalid module IDs in `/quiz/[moduleId]` and `/exam/[moduleId]`. Implement clean empty state with upload link on `/`. | M1 | PLANNED |
| 3 | M3: Admin Direct Publishing & Cross-Device Synchronization | Ensure Admin portal (`/admin`) mutations go directly to PostgreSQL, handle alerts, evict client caches on deletion, and update test assertions in unit tests. | M1, M2 | PLANNED |
| 4 | Final: 100% E2E Test Suite & Adversarial Coverage Hardening | Run and verify 100% pass on E2E test suites (Tiers 1-4) and Tier 5 adversarial hardening with Challenger / Auditor verification. | M1, M2, M3 | PLANNED |

## Interface Contracts
### `lib/supabase/admin.ts`
- Exports `createAdminClient(): SupabaseClient`
- Uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Configured with `{ auth: { persistSession: false, autoRefreshToken: false } }`

### `app/api/modules/route.ts`
- `GET(request: NextRequest)`:
  - Query: optional `?type=quiz|exam`, `?course=...`
  - Response: `{ success: true, count: number, modules: PrepPulseModule[] }` (200 OK)
- `POST(request: NextRequest)`:
  - Body: `PrepPulseModule | PrepPulseModule[] | { modules: PrepPulseModule[] }`
  - Response: `{ success: true, count: number, modules: PrepPulseModule[] }` (201 Created) or `{ error: string, details?: any }` (400 / 500)
- `DELETE(request: NextRequest)`:
  - Query: `?moduleId=...`
  - Response: `{ success: true, moduleId: string, deleted: boolean }` (200 OK) or `{ error: string }` (400 / 500)

### `app/api/modules/[moduleId]/route.ts`
- `GET(request: NextRequest, { params })`:
  - Path param: `moduleId`
  - Response: `{ success: true, module: PrepPulseModule }` (200 OK) or `{ error: "Module '...' not found" }` (404 Not Found)

## Code Layout
- `lib/supabase/admin.ts`: Admin Supabase client using Service Role key
- `app/api/modules/route.ts`: API route for modules listing, creation, deletion
- `app/api/modules/[moduleId]/route.ts`: API route for single module lookup
- `app/page.tsx`: Learner home / catalog
- `app/admin/page.tsx`: Admin console
- `app/(player)/quiz/[moduleId]/page.tsx`: Quiz player with 404 handling
- `app/(player)/exam/[moduleId]/page.tsx`: Exam player with 404 handling
- `app/(player)/results/[sessionId]/page.tsx`: Results page
- `tests/unit/`: Vitest unit tests
- `tests/e2e/`: Tiered E2E test suites (Tiers 1-5)
