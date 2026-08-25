"use client";

import Link from "next/link";
import { Zap, ArrowRight, ShieldCheck, LayoutDashboard } from "lucide-react";

export default function LoginPage() {
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
          <h1 className="text-2xl font-black text-white">Open Public Access</h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
            PrepPulse is fully open. You don&apos;t need an account to practice quizzes, take mock exams, or upload and access modules.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-4 text-left">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 active:scale-[0.99] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Open Public Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/create"
            className="w-full py-3 px-4 rounded-2xl bg-black border border-[#333333] hover:border-neutral-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <span>Upload JSON Modules</span>
          </Link>

          <div className="pt-4 border-t border-[#1a1a1a] text-center space-y-2">
            <p className="text-[11px] text-neutral-500">
              Are you an instructor or course administrator?
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-semibold underline underline-offset-4"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Admin Console Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
