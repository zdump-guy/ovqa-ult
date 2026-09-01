# Project: PrepPulse Refactoring

## Architecture
PrepPulse is a zero-friction, course-first learning platform built on Next.js 15 App Router, React 19, Tailwind CSS, TypeScript, and Supabase with a 4-tier resilience fallback (Supabase -> Server In-Memory -> LocalStorage -> Static Demo Modules).

The refactored architecture establishes a strict separation of concerns:
- **Learner Flow (`/`, `/quiz/[moduleId]`, `/exam/[moduleId]`, `/history`, `/results/[sessionId]`)**: Zero-friction, course-first exploration. Courses cleanly partition into "Practice Quizzes" and "Simulated Exams" with single-click direct start actions. No creation/upload or deletion clutter in the learner interface.
- **Admin Portal (`/admin`, `/admin/login`)**: Protected by dedicated passcode authentication. Centralizes all module creation tools (JSON File Upload, AI PDF Extraction & Generation, Interactive JSON Editor) and administrative operations (listing, searching, previewing, and deleting modules).
- **API Persistence Layer (`/api/modules`, `/api/sessions`, `/api/upload`, `/api/generate-module`)**: Centralized gateway syncing with Supabase PostgreSQL tables (`modules`, `questions`, `test_sessions`) with seamless in-memory and local fallback.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| F1 | Centralized Module Persistence & API Gateway | `/api/modules` CRUD against Supabase `modules` & `questions` tables with resilient fallback, accurate course categorization, subject, title, moduleType ("quiz" vs "exam"), questions | M1 | R1, survey |
| F2 | Passcode-Protected Admin Authentication | `/admin/login` requiring dedicated passcode with session cookie protection for `/admin` | M2 | R2, survey |
| F3 | Admin Module Ingress & Management Hub | Dedicated `/admin` portal consolidating JSON file upload, JSON module editor, AI PDF extraction tools, listing, searching, previewing, and deleting modules | M2 | R2, survey |
| F4 | Admin Module Publishing to API | Ingested modules in Admin portal publish directly to `/api/modules` for immediate catalog availability | M2 | R1, R2 |
| F5 | Course-First Learner Experience on Root `/` | Root `/` directly renders the clean Course Library with course categorization | M3 | R3, survey |
| F6 | Distinct Practice Quiz and Simulated Exam Separation | Inside each course card/section, modules are cleanly split into Practice Quizzes and Simulated Exams | M3 | R3, survey |
| F7 | Single-Click Direct Module Launch | "Start Quiz" directly links to `/quiz/[moduleId]` and "Start Exam" directly links to `/exam/[moduleId]` | M3 | R3, survey |
| F8 | Minimal Learner Navigation Header | Header with Logo, History link, and unobtrusive Admin link (no `/create` link) | M3 | R3, survey |
| F9 | Clutter Removal & `/create` Route Elimination | Delete `app/(dashboard)/create/page.tsx` and strip manage checkboxes, batch action bars, and delete modals from learner UI | M4 | R4, survey |
| F10 | Engine & Diagnostic Scoring Preservation | Maintain Rapid Checkpoint Quiz Engine, Mock Exam Simulator, score calculator, remediation planner, and session logging | M4 | R4, survey |
| F11 | End-to-End Build & Test Suite Verification | Full Vitest unit test suite (301 tests) and E2E test suite pass with zero regressions, and `npm run build` succeeds | M5 | Acceptance criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Centralized Module Persistence & API Sync | Verify & ensure `/api/modules` handles full module schema with course metadata, Supabase sync & resilient fallback | none | DONE |
| M2 | Dedicated Admin Portal & Passcode Auth | Create `/admin/login` with passcode auth, consolidate upload/editor/AI tools in `/admin`, module listing & deletion | M1 | DONE |
| M3 | Streamlined Learner Experience | Root `/` Course Library, clear separation of Quizzes and Exams, single-click direct Start buttons, minimal header | M1 | DONE |
| M4 | Clutter Removal & Codebase Cleanup | Remove `/create`, strip batch toolbars/delete modals from learner UI, preserve quiz/exam player engines & scoring | M2, M3 | DONE |
| M5 | Full Verification & Regression Testing | Run `npm test`, `npm run test:e2e`, `npm run build`, review and verify zero regressions | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Admin Portal ↔ API Gateway
- `POST /api/modules`: Accepts single `PrepPulseModule`, array `PrepPulseModule[]`, or `{ modules: PrepPulseModule[] }`. Returns HTTP 201 `{ success: true, count: number, modules: PrepPulseModule[] }`.
- `DELETE /api/modules?moduleId=<id>`: Deletes module by ID. Returns HTTP 200 `{ success: true, moduleId: string, deleted: boolean }`.
- `GET /api/modules`: Returns `{ success: true, count: number, modules: PrepPulseModule[] }`.

### Admin Auth ↔ Admin Portal
- Passcode cookie: `preppulse_admin_token` verified on `/admin` requests or via middleware/API check.
- Valid passcode: env `ADMIN_PASSCODE` (defaulting to `preppulse-admin-2026` or `admin123`).

### Learner Flow ↔ Player Engines
- Quiz start: `<Link href={/quiz/${module.moduleId}}>` with direct launch into `RapidCheckpointQuiz`.
- Exam start: `<Link href={/exam/${module.moduleId}}>` with direct launch into `MockExamSimulator`.
- Results / History: `/history` accessing `/api/sessions` or `localStorage.preppulse_guest_session_*`.

## Code Layout
```
app/
  page.tsx                         # Streamlined Course Library & Learner Home (R3)
  layout.tsx                       # Global Root Layout
  (dashboard)/
    history/page.tsx               # Session history viewer
    dashboard/page.tsx             # Redirect to / or alias for Course Library
    create/page.tsx                # Redirect to /admin
  admin/
    page.tsx                       # Dedicated Admin Upload & Management Portal (R2)
    login/page.tsx                 # Passcode-protected Admin Login (R2)
    actions.ts                     # Admin passcode login/logout server actions
  (player)/
    quiz/[moduleId]/page.tsx       # Rapid Checkpoint Quiz Engine (R4 preserved)
    exam/[moduleId]/page.tsx       # Mock Exam Simulator Engine (R4 preserved)
    results/[sessionId]/page.tsx   # Diagnostic Scorecard & Remediation Report
  api/
    modules/route.ts               # Centralized Module Persistence Gateway (R1)
    modules/[moduleId]/route.ts    # Single module retrieval
    upload/route.ts                # PDF/TXT document text extraction
    generate-module/route.ts       # AI module generator
    sessions/route.ts              # Test session attempt logger
components/
  dashboard/                       # Learner catalog components (Course card, Quiz vs Exam lists)
  admin/                           # Admin tools (JsonFileUpload, JsonModuleEditor, PdfDropzone, ModuleManager)
  layout/                          # Header (Logo, History, Admin link), Footer
lib/
  schema.ts                        # Zod schemas (Module, Question, Config, Diagnostics)
  demo-modules.ts                  # Static demo modules
  guest-session.ts                 # LocalStorage & offline resilience sync
  quiz/                            # Quiz engine hooks & logic
  exam/                            # Exam engine hooks & logic
  diagnostics/                     # Scoring & remediation calculation
```
