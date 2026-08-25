# PrepPulse ⚡

> **An AI-powered active recall study companion, mock exam simulator, and diagnostic platform.**

PrepPulse transforms course syllabi, lecture slides, and notes into structured **Rapid Checkpoint Quizzes** and **Timed Mock Exams** with deep **Diagnostic Analytics**, **Remediation Modules**, and **Multi-Course Organization**.

---

## 🌟 Key Features

### 1. ⏱️ Active Recall & Exam Simulation
- **Rapid Checkpoint Quizzes**: Chunked study sessions with instant feedback, streak mechanics, fast timers, and unlockable checkpoints.
- **Comprehensive Mock Exam Simulator**: Full-length timed mock exams featuring flag-for-review navigation grids, live countdown timers with auto-submit, and persistent localStorage session auto-save recovery.
- **Smart Retry & Remediation**: Auto-generates targeted remediation modules focusing on your specific weak spots after any quiz or exam.

### 2. 📊 Diagnostic Analytics & Velocity Scoring
- **Topic Mastery Breakdown**: Visual competence ratings (Needs Review, Competent, Mastered) mapped by subject tags.
- **Time Velocity Charts**: Identifies rushed answers vs. "time trap" questions to optimize pacing.
- **Scorecards & Historical Review**: Detailed question-by-question review with explanations and session history tracking.

### 3. 📝 Live In-Browser JSON Editor & Compatibility Checker
- **Direct JSON Import**: Paste raw JSON or drag-and-drop `.json` module files.
- **Live Schema Validation**: Real-time validation against the strict `ModuleZodSchema` with inline syntax and structural error highlights.
- **2-Space Auto-Formatter**: One-click JSON indentation and beautification.
- **One-Click Launch**: Instantly import to a designated course and launch the quiz or exam.

### 4. 🗂️ Course Categorization & Library Management
- **Course Organization**: Assign modules to courses (e.g., `CS 401: Deep Learning`, `BIO 101: Cell Biology`).
- **Dynamic Course Filter Bar**: Filter your module library with single-click tabs and live count badges.
- **Grid vs. Accordion Views**: Toggle between standard responsive cards and collapsible course-grouped accordion panels.
- **Library Manage Mode**: Multi-select custom modules for batch deletion or batch reassignment to different courses with confirmation safety modals.

### 5. 🤖 AI Document Ingestion
- **PDF & Text Parsing**: Ingest course documents, lecture notes, or syllabi to auto-generate customized quiz/exam modules via Google Gemini or OpenAI.

### 6. 🔒 Hybrid Storage Architecture
- **Guest Mode**: Zero-friction instant study sessions powered by client-side storage (`localStorage`).
- **Cloud Sync**: Supabase authentication and PostgreSQL database with Row Level Security (RLS) for multi-tenant account synchronization.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) (Pure Black OLED Design System) |
| **Animations & Icons** | [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Database & Auth** | [Supabase](https://supabase.com/) (`@supabase/ssr`, `@supabase/supabase-js`, PostgreSQL + RLS) |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/google`, `@ai-sdk/openai`, `ai`) |
| **Validation** | [Zod 3.24](https://zod.dev/) |
| **Testing** | [Vitest](https://vitest.dev/), [@testing-library/react](https://testing-library.com/), [jsdom](https://github.com/jsdom/jsdom), [tsx](https://github.com/privatenumber/tsx) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+ installed
- npm, pnpm, or yarn

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd ovqa
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and supply your API keys:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider API Keys (Optional for local/demo play, required for AI generation)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup (Supabase)
To provision the database schema and security policies:
1. Apply the initial schema from `supabase/migrations/20260824000001_initial_schema.sql` in your Supabase SQL Editor.
2. (Optional) Run `supabase/seed.sql` to populate sample module data and demo accounts.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Scripts & Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server on `localhost:3000` |
| `npm run build` | Builds the optimized production application |
| `npm run start` | Runs the production build server |
| `npm run lint` | Runs Next.js ESLint checks |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm test` | Runs the Vitest unit and integration test suite |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run test:e2e` | Runs the comprehensive 5-Tier standalone E2E test suite |

---

## 🧪 Testing Strategy

PrepPulse features an exhaustive multi-tier testing pipeline:
- **Unit & Component Testing (Vitest)**: 230 tests across schema validators, storage lifecycles, quiz state machines, exam simulators, diagnostic calculators, and UI helpers.
- **Opaque-Box E2E Testing (Tiers 1–5)**: 163 tests covering:
  - **Tier 1**: Feature coverage for ingestion, deletion, courses, quiz/exam engines, and RLS.
  - **Tier 2**: Boundary & edge-case testing (malformed inputs, 0/100% scores, mass deletions).
  - **Tier 3**: Cross-feature interactions (Ingress -> Edit -> Play -> Score -> Delete).
  - **Tier 4**: Real-world persona workflows (Professors, Students, TAs, Guest Explorers).
  - **Tier 5**: Adversarial stress testing (injection resistance, high-volume batches, state thrashing).

Run all tests:
```bash
npm test
npm run test:e2e
```

---

## 📁 Project Structure

```
├── app/
│   ├── (auth)/              # Authentication routes (login, signup, actions)
│   ├── (dashboard)/         # Main application pages (dashboard, create, history)
│   ├── (player)/            # Active study players (quiz, exam, results)
│   ├── api/                 # Backend route handlers (generate-module, sessions, upload)
│   ├── globals.css          # Tailwind CSS root styles
│   └── layout.tsx           # Root application layout
├── components/
│   ├── dashboard/           # Dashboard cards, action bars, filter tabs, accordions
│   ├── diagnostics/         # Scorecards, mastery bars, time velocity charts
│   ├── editor/              # In-browser live JSON compatibility editor
│   ├── exam/                # Exam question viewer, navigation grid, submit modal
│   ├── quiz/                # Checkpoint quiz card, timers, overlays
│   └── upload/              # File dropzone & module configuration drawer
├── lib/
│   ├── ai/                  # AI generation & PDF extraction logic
│   ├── audio/               # Web Audio API sound effects
│   ├── diagnostics/         # Scoring algorithms & remediation generators
│   ├── exam/                # Exam session state hook & persistence
│   ├── quiz/                # Checkpoint quiz state machine & shuffle logic
│   ├── supabase/            # Supabase browser, server, and middleware clients
│   ├── demo-modules.ts      # Built-in study modules
│   ├── guest-session.ts     # LocalStorage state management
│   └── schema.ts            # Zod validation schemas
├── supabase/
│   ├── migrations/          # PostgreSQL database migrations & RLS policies
│   └── seed.sql             # Database seeds
├── tests/
│   ├── e2e/                 # 5-Tier standalone E2E requirement test suites
│   ├── fixtures/            # Sample module fixtures & session mocks
│   ├── harness/             # Assertion library & mock runtime harness
│   └── unit/                # Vitest unit test suites
├── types/
│   └── index.ts             # Global TypeScript type definitions
└── module_schema.json       # JSON Schema specification for PrepPulse modules
```

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
