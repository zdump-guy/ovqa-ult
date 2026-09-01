"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DiagnosticReport, PrepPulseModule, TestSession } from "@/types";
import { DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE, getDemoModule } from "@/lib/demo-modules";
import {
  getGuestDiagnosticReport,
  getGuestSession,
  getLocalCustomModules,
  saveLocalCustomModule,
} from "@/lib/guest-session";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { generateSmartRetryModule } from "@/lib/diagnostics/remediation";
import { Scorecard } from "@/components/diagnostics/Scorecard";
import { TopicMastery } from "@/components/diagnostics/TopicMastery";
import { TimeVelocityChart } from "@/components/diagnostics/TimeVelocityChart";
import { QuestionReview } from "@/components/diagnostics/QuestionReview";
import {
  ArrowLeft,
  Flame,
  RotateCcw,
  LayoutDashboard,
  PlusCircle,
  Share2,
  Printer,
  Check,
} from "lucide-react";

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;
  const router = useRouter();

  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [, setSession] = useState<TestSession | null>(null);
  const [module, setModule] = useState<PrepPulseModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // 1. Check local guest diagnostic report
    const localReport = getGuestDiagnosticReport(sessionId);
    const localSession = getGuestSession(sessionId);

    let resolvedModule: PrepPulseModule | undefined;

    // Find the associated module
    if (localSession?.moduleId) {
      resolvedModule =
        getDemoModule(localSession.moduleId) ||
        getLocalCustomModules().find((m) => m.moduleId === localSession.moduleId);
    }

    if (!resolvedModule) {
      if (sessionId.includes("exam") || sessionId.startsWith("demo-exam")) {
        resolvedModule = DEMO_EXAM_MODULE;
      } else {
        resolvedModule = DEMO_QUIZ_MODULE;
      }
    }

    // If we have a stored report, load it
    if (localReport && localReport.questionReviews) {
      setReport(localReport);
      setSession(localSession);
      setModule(resolvedModule);
      setLoading(false);
      return;
    }

    // If no report in localStorage, construct an illustrative diagnostic report from the module
    const defaultAnswers: Record<string, string[]> = {};
    const defaultTimes: Record<string, number> = {};

    resolvedModule.questions.forEach((q, idx) => {
      // Simulate partial realistic results (e.g. 80% accuracy)
      if (idx % 4 !== 3) {
        defaultAnswers[q.id] = q.correctOptionIds;
      } else {
        defaultAnswers[q.id] = ["wrong_opt"];
      }
      defaultTimes[q.id] = 10 + (idx % 7) * 3;
    });

    const fallbackReport = calculateDiagnosticReport({
      module: resolvedModule,
      questions: resolvedModule.questions,
      userAnswers: defaultAnswers,
      questionTimes: defaultTimes,
    });

    setReport(fallbackReport);
    setModule(resolvedModule);
    setLoading(false);
  }, [sessionId]);

  const handleSmartRetry = () => {
    if (!module || !report || report.missedQuestionIds.length === 0) return;

    // Generate targeted smart retry module
    const retryModule = generateSmartRetryModule(module, report.missedQuestionIds);
    // Save to local storage for player discovery
    saveLocalCustomModule(retryModule);

    // Route to rapid quiz player for remediation
    router.push(`/quiz/${retryModule.moduleId}`);
  };

  const handleRetakeFull = () => {
    if (!module) return;
    const targetPath = module.moduleType === "exam" ? `/exam/${module.moduleId}` : `/quiz/${module.moduleId}`;
    router.push(targetPath);
  };

  const handleShareLink = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.warn("Failed to copy link:", err);
      }
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading || !report || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-medium">Generating Diagnostic Scorecard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-16">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-[#262626] px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white">
                Diagnostic Performance Report
              </h1>
              <p className="text-xs text-neutral-400 font-mono">Session ID: {sessionId.slice(0, 18)}...</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleShareLink}
              className="p-2 rounded-xl border border-[#333333] bg-black text-neutral-300 hover:bg-[#111111] hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Copy share link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl border border-[#333333] bg-black text-neutral-300 hover:bg-[#111111] hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Print scorecard"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Library</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Diagnostic Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* 1. Primary Scorecard */}
        <Scorecard
          report={report}
          moduleTitle={module.title}
          moduleSubject={module.targetSubject}
          moduleType={module.moduleType}
          onSmartRetry={report.missedQuestionIds.length > 0 ? handleSmartRetry : undefined}
          onRetake={handleRetakeFull}
        />

        {/* 2. Topic Mastery Breakdown */}
        <TopicMastery
          topicMastery={report.topicMastery}
          difficultyAccuracy={report.difficultyAccuracy}
        />

        {/* 3. Time Velocity Analysis */}
        <TimeVelocityChart
          questionReviews={report.questionReviews}
          averagePaceSeconds={report.averagePaceSeconds}
          timeTraps={report.timeTraps}
          rushedErrors={report.rushedErrors}
        />

        {/* 4. Question-by-Question Review with AI Rationales */}
        <QuestionReview
          questionReviews={report.questionReviews}
          timeTraps={report.timeTraps}
          rushedErrors={report.rushedErrors}
        />

        {/* 5. Sticky Bottom Action Bar */}
        <div className="p-4 sm:p-6 rounded-3xl bg-[#0a0a0a] border border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-bold text-sm text-white">
              Ready for the next step?
            </h3>
            <p className="text-xs text-neutral-400">
              Continue training weak concepts or create a new custom module.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center">
            {report.missedQuestionIds.length > 0 && (
              <button
                type="button"
                onClick={handleSmartRetry}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-black text-black" />
                <span>Smart Retry ({report.missedQuestionIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRetakeFull}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#333333] bg-black hover:bg-[#111111] hover:border-neutral-400 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Test</span>
            </button>

            <Link
              href="/create"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#333333] bg-black hover:bg-[#111111] hover:border-neutral-400 text-white font-semibold text-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Module</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

