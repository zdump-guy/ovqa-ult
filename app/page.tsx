import Link from "next/link";
import {
  Zap,
  BookOpen,
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  PlusCircle,
  History,
  LayoutDashboard,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 max-w-6xl mx-auto w-full bg-black text-white">
      {/* Navigation header */}
      <header className="w-full flex items-center justify-between py-4 mb-8 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-black font-black">
            <Zap className="h-5 w-5 fill-black text-black" />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Prep<span className="text-neutral-400">Pulse</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#111111] rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#111111] rounded-xl transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload / Create</span>
          </Link>
          <Link
            href="/history"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#111111] rounded-xl transition-colors"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
          <Link
            href="/admin/login"
            className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 border border-[#262626] rounded-xl hover:bg-[#111111] transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-[#333333] text-neutral-300 text-xs font-bold uppercase tracking-wider">
          <BrainCircuit className="w-4 h-4 text-white" /> AI-Powered Exam Acceleration
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
          Accelerate Exam Mastery with PrepPulse
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto">
          Convert course syllabi and lecture slides into high-velocity cognitive checkpoints and full-length exam simulations with smart remediation feedback.
        </p>

        {/* Quick Launch Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Open Dashboard</span>
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-[#333333] bg-black hover:bg-[#111111] hover:border-neutral-400 text-white font-bold text-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Generate from Notes</span>
          </Link>
        </div>
      </div>

      {/* Dual Testing Engines Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full max-w-4xl">
        {/* Card 1: Rapid Checkpoint Quiz Engine */}
        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Cognitive Recall Engine
              </span>
              <h2 className="text-2xl font-black text-white">
                Rapid Checkpoint Quiz
              </h2>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              Train fast factual recall with 5-question tiers, micro-countdown timers, streak multipliers, and instant fail/retry barriers.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/quiz/demo-quiz-1"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm transition-all"
            >
              <span>Launch Demo Quiz</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Mock Exam Simulator */}
        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Real-World Simulation
              </span>
              <h2 className="text-2xl font-black text-white">
                Full Mock Exam
              </h2>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              Simulate exam conditions with sticky countdown timer, 4-state question navigation grid, flag-for-review (<kbd className="px-1 rounded bg-[#1a1a1a] border border-[#333333] font-mono text-[10px] text-white">F</kbd>), and pre-submit review drawer.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/exam/demo-exam-1"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm transition-all"
            >
              <span>Launch Mock Exam</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-white" /> Guest Mode Ready</span>
        <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-white" /> Zero Latency Web Audio</span>
        <span className="flex items-center gap-1.5"><BrainCircuit className="w-4 h-4 text-white" /> Google Gemini AI Pipeline</span>
        <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-white" /> Smart Remediation</span>
      </div>
    </main>
  );
}

