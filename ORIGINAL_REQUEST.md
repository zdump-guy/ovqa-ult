# Original User Request

## 2026-09-01T14:50:06Z

Refactor and simplify the PrepPulse project to streamline the learner flow into a zero-friction, course-first experience while consolidating all module uploading and library management into a dedicated, passcode-protected admin portal.

Working directory: /home/bravo-07/Documents/dev/ovqa
Integrity mode: development

## Requirements

### R1. Centralized Module Persistence & API Synchronization
- Ensure `/api/modules` serves as the primary gateway for querying, creating, and deleting quiz and exam modules against the centralized database (Supabase `modules` table), with resilient offline/demo fallback.
- Ensure all uploaded modules accurately preserve Course categorization, Subject, Title, ModuleType (`quiz` vs `exam`), and question payload.

### R2. Dedicated Admin Upload & Management Portal (/admin)
- Protect the `/admin` console with a secure admin key/passcode check (via `/admin/login`).
- Consolidate all module creation tools (JSON File Upload, Direct JSON Editor, AI PDF generator) exclusively inside the `/admin` portal.
- Enable the admin to specify Course name, Module Title, Target Subject, and Module Type (`quiz` | `exam`) and publish modules directly to the database.
- Provide a module management view for the admin to search, preview, and delete live modules from the repository.

### R3. Streamlined Learner Experience with Clear Course, Quiz, and Exam Separation
- Simplify the home/root route (`/`) to directly display a clean Course Library (e.g., Biology, Computer Science, Organic Chemistry) without marketing clutter or complex management toolbars.
- Selecting a Course presents a dedicated, focused course view with two distinct, separated sections: **Practice Quizzes** and **Simulated Exams**.
- Each quiz/exam card provides essential details (question count, duration) and a single-click direct **Start** action navigating directly to the quiz player (`/quiz/[moduleId]`) or exam player (`/exam/[moduleId]`).
- The top header is minimal and distraction-free: Brand logo, **History** (for viewing past test attempts and diagnostics), and an unobtrusive **Admin** access link.

### R4. Clutter Removal & Codebase Cleanup
- Remove the user-facing `/create` route and strip out user-facing batch-selection toolbars and delete modals from the learner dashboard.
- Maintain existing player engines, diagnostic scoring calculations, and test runners.

## Acceptance Criteria

### Storage & Admin
- [ ] Admin portal at `/admin` requires passcode authentication (`/admin/login`).
- [ ] Admins can successfully upload JSON modules and publish them to `/api/modules`.
- [ ] Admin can view the list of all modules and delete modules.
- [ ] No module upload or creation interface is visible in the general learner UI.

### Learner Flow & Separation
- [ ] Root `/` presents a streamlined course catalog.
- [ ] Courses are clearly organized, and selecting a course clearly separates **Practice Quizzes** from **Simulated Exams**.
- [ ] Clicking "Start Quiz" directly launches `/quiz/[moduleId]`.
- [ ] Clicking "Start Exam" directly launches `/exam/[moduleId]`.
- [ ] Learner history remains accessible via a minimal History link.

### Quality & Verification
- [ ] `npm run build` succeeds with zero TypeScript or Next.js errors.
- [ ] All unit and integration test suites (`npm test` or `npx vitest run`) pass without regression.
