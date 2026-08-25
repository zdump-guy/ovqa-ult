"use client";

import Link from "next/link";
import { Zap, ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 py-12 text-white font-sans">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Brand Header */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-black font-black">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Prep<span className="text-neutral-400">Pulse</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] border border-[#333333] text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            <Sparkles className="w-3.5 h-3.5" /> Zero Account Setup
          </div>
          <h1 className="text-2xl font-black text-white">No Sign Up Needed</h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
            All quizzes, mock exams, scoring analytics, and uploaded JSON modules are publicly accessible at all times without signing up.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-4 text-left">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 active:scale-[0.99] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Go to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/create"
            className="w-full py-3 px-4 rounded-2xl bg-black border border-[#333333] hover:border-neutral-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <span>Upload JSON Modules</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
