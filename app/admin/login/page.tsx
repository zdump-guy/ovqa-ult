"use client";

import { useActionState, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminLogin, type AdminAuthResult } from "@/app/admin/actions";
import { ShieldCheck, ArrowRight, AlertCircle, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin";
  const [showPasscode, setShowPasscode] = useState(false);
  const [state, formAction, isPending] = useActionState<AdminAuthResult | null, FormData>(
    adminLogin,
    null
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 py-12 text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Top return link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Learner Library
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-black font-black mb-1 shadow-md">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Console Portal</h1>
          <p className="text-xs text-neutral-400">
            Enter administrator passcode to manage global modules, upload datasets, and configure repository settings.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 flex items-start gap-2.5 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectPath} />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                Administrator Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  name="passcode"
                  required
                  autoFocus
                  placeholder="Enter admin passcode"
                  className="w-full px-3.5 py-3 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  title={showPasscode ? "Hide Passcode" : "Show Passcode"}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.99] text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm mt-2"
            >
              {isPending ? (
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate & Enter Console</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#1a1a1a] text-center space-y-1">
            <p className="text-[11px] text-neutral-400">
              Students and general visitors do not need an account.
            </p>
            <p className="text-[11px] text-neutral-500">
              All practice quizzes, mock exams, and scorecards are open to learners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
