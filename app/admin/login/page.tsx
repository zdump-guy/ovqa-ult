"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionResult } from "@/app/(auth)/actions";
import { ShieldCheck, ArrowRight, AlertCircle, ArrowLeft } from "lucide-react";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin";
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    login,
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
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-black font-black mb-1 shadow-md">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Console Portal</h1>
          <p className="text-xs text-neutral-400">
            Sign in with administrator credentials to manage and control global modules.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-3xl p-6 md:p-8 space-y-5">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 flex items-start gap-2.5 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectPath} />

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@preppulse.internal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.99] text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isPending ? (
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[#1a1a1a] text-center">
            <p className="text-[11px] text-neutral-500">
              Students and general visitors do not need an account. All practice quizzes, mock exams, and uploads are public without sign-in.
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
