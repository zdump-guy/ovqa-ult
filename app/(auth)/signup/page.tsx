"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signup, type AuthActionResult } from "@/app/(auth)/actions";
import { Zap, ArrowRight, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signup,
    null
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 py-12 text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-black font-black">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Prep<span className="text-neutral-400">Pulse</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-white">Create Your Account</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Unlock AI module generation, progress tracking & cloud sync
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 md:p-8">
          {state?.error && (
            <div className="mb-5 p-3 rounded-lg bg-[#111111] border border-neutral-700 flex items-start gap-2.5 text-white text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-neutral-300" />
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && (
            <div className="mb-5 p-3 rounded-lg bg-[#111111] border border-neutral-700 flex items-start gap-2.5 text-white text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-white" />
              <span>
                Account created! Please check your email to confirm your account, then{" "}
                <Link href="/login" className="underline font-bold text-white">
                  sign in
                </Link>
                .
              </span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectPath} />

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#333333] text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0a0a0a] px-3 text-neutral-400 uppercase tracking-wider">
                Or explore without sign up
              </span>
            </div>
          </div>

          {/* Guest Demo Action */}
          <Link
            href="/exam/demo-exam-1"
            className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-[#111111] border border-[#333333] hover:border-neutral-400 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-white" />
            <span>Try Full Exam Simulator as Guest</span>
          </Link>
        </div>

        {/* Footer Navigation */}
        <div className="text-center mt-6">
          <p className="text-sm text-neutral-400">
            Already have an account?{" "}
            <Link
              href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="text-white hover:underline font-semibold transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

