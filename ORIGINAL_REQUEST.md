# Original User Request

## Initial Request — 2026-09-01T18:54:33+03:00

<USER_REQUEST>
Fix cross-device module synchronization by properly persisting all uploaded modules to Supabase PostgreSQL using the Service Role admin client (resolving RLS error 42501), and completely purge all hardcoded mock/demo data from the learner and player fallback layers.

Working directory: /home/bravo-07/Documents/dev/ovqa
Integrity mode: development

## Requirements

### R1. Real Cloud Persistence via Supabase Service Role (Cross-Device Sync)
- Update `/api/modules` (GET, POST, DELETE) and `/api/modules/[moduleId]` to use the Supabase Service Role admin client for database operations to bypass RLS restrictions and guarantee that uploaded modules are permanently saved to PostgreSQL.
- Return explicit HTTP errors if a database write fails rather than silently swallowing errors and falling back to ephemeral in-memory maps.
- Ensure any module uploaded on one device is immediately queryable and playable from any other device or browser.

### R2. Complete Removal of Mock/Demo Data & Fallback Hallucinations
- Remove all hardcoded demo/mock modules (`ALL_DEMO_MODULES`, `DEMO_QUIZ_MODULE`, `DEMO_EXAM_MODULE`) from the runtime catalog, API responses, and player fallbacks.
- When no modules exist in the database, display a clean, accurate empty state ("No modules uploaded yet") with an admin upload link instead of rendering fake sample courses.
- In `/quiz/[moduleId]` and `/exam/[moduleId]`, if a requested module ID is not found in Supabase, display a clear "Module Not Found" error screen instead of silently substituting a mock quiz/exam.

### R3. Admin Portal Direct Database Publishing
- Ensure the Admin Portal (`/admin`) performs direct server mutations against `/api/modules` with immediate feedback (success/error alerts).
- When an admin deletes a module from the admin console, delete it directly from Supabase PostgreSQL and evict any cached copies across all clients.

## Acceptance Criteria

### Persistence & Cross-Device Access
- [ ] Uploading a JSON module in `/admin` inserts real records into the Supabase `modules` table (verified via Supabase client with 0 RLS errors).
- [ ] Querying `GET /api/modules` from any client/browser returns the uploaded module without requiring LocalStorage.
- [ ] Loading `/quiz/[moduleId]` and `/exam/[moduleId]` fetches and plays the exact uploaded module.

### Zero Mock Data
- [ ] No hardcoded mock biology/computer science modules appear when the database is empty.
- [ ] Invalid or non-existent module IDs show a 404 "Module Not Found" screen instead of substituting demo questions.

### Quality & Tests
- [ ] `npm run build` succeeds with zero errors.
- [ ] Test suites pass with updated real-data assertions.
</USER_REQUEST>
