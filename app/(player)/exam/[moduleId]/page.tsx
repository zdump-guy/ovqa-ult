"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PrepPulseModule } from "@/types";
import { DEMO_EXAM_MODULE, getDemoModule } from "@/lib/demo-modules";
import { getLocalCustomModules } from "@/lib/guest-session";
import { useExamSession } from "@/lib/exam/useExamSession";
import { QuestionNavigationGrid } from "@/components/exam/QuestionNavigationGrid";
import { ExamQuestionViewer } from "@/components/exam/ExamQuestionViewer";
import { SubmitConfirmationModal } from "@/components/exam/SubmitConfirmationModal";
import {
  ArrowLeft,
  Clock,
  Send,
  Star,
  CheckCircle2,
  ShieldCheck,
  Layers,
} from "lucide-react";

interface ExamPlayerPageProps {
  params: Promise<{ moduleId: string }>;
}

export default function ExamPlayerPage({ params }: ExamPlayerPageProps) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.moduleId;
  const router = useRouter();

  const [module, setModule] = useState<PrepPulseModule | null>(null);
  const [loading, setLoading] = useState(true);

  // Load module from demo pool, local custom modules, or fallback
  useEffect(() => {
    let foundModule: PrepPulseModule | undefined = getDemoModule(moduleId);

    if (!foundModule) {
      const localModules = getLocalCustomModules();
      foundModule = localModules.find((m) => m.moduleId === moduleId);
    }

    if (!foundModule && moduleId.startsWith("demo-")) {
      foundModule = DEMO_EXAM_MODULE;
    }

    // Default fallback to DEMO_EXAM_MODULE
    setModule(foundModule || DEMO_EXAM_MODULE);
    setLoading(false);
  }, [moduleId]);

  if (loading || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-medium">Loading Mock Exam Simulator...</p>
        </div>
      </div>
    );
  }

  return <ExamSimulatorView module={module} router={router} />;
}

interface ExamSimulatorViewProps {
  module: PrepPulseModule;
  router: ReturnType<typeof useRouter>;
}

function ExamSimulatorView({ module, router }: ExamSimulatorViewProps) {
  const [submittedSessionId, setSubmittedSessionId] = useState<string | null>(null);

  const exam = useExamSession(module, {
    autoRestore: true,
    onSubmit: async (report, session) => {
      const generatedSessionId =
        session.id || `sess_exam_${module.moduleId || "mod"}_${Date.now()}`;
      setSubmittedSessionId(generatedSessionId);

      // Attempt to sync to API route in background
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: generatedSessionId,
            moduleId: module.moduleId || "demo-exam-1",
            sessionType: "exam",
            status: report.passed ? "passed" : "failed",
            totalQuestions: report.totalQuestions,
            correctAnswers: report.correctCount,
            scorePercentage: report.scorePercentage,
            timeSpentSeconds: report.totalTimeSpentSeconds,
            breakdown: report,
          }),
        });
      } catch (err) {
        console.warn("Background session persistence sync notice:", err);
      }

      // Automatically route to results after brief delay
      setTimeout(() => {
        router.push(`/results/${generatedSessionId}`);
      }, 1500);
    },
  });

  const {
    questions,
    currentQuestion,
    currentIndex,
    userAnswers,
    flaggedQuestionIds,
    timeRemainingSeconds,
    totalDurationSeconds,
    formattedTimeRemaining,
    isSubmitted,
    isSubmitting,
    isReviewDrawerOpen,
    summary,
    selectOption,
    clearAnswer,
    toggleFlag,
    navigateTo,
    nextQuestion,
    prevQuestion,
    openReviewDrawer,
    closeReviewDrawer,
    submitExam,
    getQuestionState,
  } = exam;

  // Timer urgency calculations
  const timeProgressFraction =
    totalDurationSeconds > 0 ? timeRemainingSeconds / totalDurationSeconds : 0;

  const passingScorePercentage = module.config?.examConfig?.passingScorePercentage ?? 60;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-black/95 backdrop-blur-md border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Left: Return & Exam Information */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors shrink-0"
              title="Leave Exam"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono">
                  Full Mock Exam
                </span>
                <h1 className="font-bold text-sm sm:text-base truncate text-white">
                  {module.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span className="truncate hidden md:inline">{module.targetSubject}</span>
                <span className="hidden md:inline">•</span>
                <span className="font-mono">Pass Mark: {passingScorePercentage}%</span>
              </div>
            </div>
          </div>

          {/* Center: Sticky Overall Exam Duration Timer */}
          <div
            className="flex flex-col items-center justify-center px-4 py-1.5 rounded-2xl border border-[#262626] bg-[#0a0a0a] text-white transition-all select-none shrink-0"
            data-testid="exam-duration-timer"
            role="timer"
            aria-label={`Time remaining: ${formattedTimeRemaining}`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="font-mono text-base sm:text-lg font-black tracking-wider text-white">
                {formattedTimeRemaining}
              </span>
            </div>

            {/* Micro progress line */}
            <div className="w-full h-1 bg-[#262626] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, timeProgressFraction * 100))}%` }}
              />
            </div>
          </div>

          {/* Right: Quick Stats & Submit Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Answered Pill */}
            <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-xl bg-[#111111] border border-[#333333] text-xs font-semibold text-white font-mono">
              <span>{summary.answeredCount}</span>
              <span className="text-neutral-500">/</span>
              <span>{summary.totalQuestions} Answered</span>
            </div>

            {/* Quick Flagged Pill */}
            {summary.flaggedCount > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#111111] border border-[#333333] text-xs font-semibold text-white font-mono">
                <Star className="w-3 h-3 fill-white text-white" />
                <span>{summary.flaggedCount}</span>
              </div>
            )}

            {/* Submit Exam Button */}
            <button
              type="button"
              onClick={openReviewDrawer}
              data-testid="header-submit-exam-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exam Question Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {currentQuestion ? (
            <ExamQuestionViewer
              question={currentQuestion}
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              selectedOptionIds={userAnswers[currentQuestion.id] || []}
              isFlagged={flaggedQuestionIds.has(currentQuestion.id)}
              onSelectOption={(optionId) => selectOption(currentQuestion.id, optionId)}
              onClearAnswer={() => clearAnswer(currentQuestion.id)}
              onToggleFlag={() => toggleFlag(currentQuestion.id)}
              onPrevQuestion={prevQuestion}
              onNextQuestion={nextQuestion}
              onOpenReviewDrawer={openReviewDrawer}
              isFirstQuestion={currentIndex === 0}
              isLastQuestion={currentIndex === questions.length - 1}
            />
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0a0a0a] border border-[#262626]">
              <p className="text-neutral-400">No question selected.</p>
            </div>
          )}

          {/* Helpful Exam Shortcut Note */}
          <div className="p-4 rounded-2xl border border-[#262626] bg-[#0a0a0a] flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Auto-saved locally. Press <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#333333] font-mono text-white font-semibold">F</kbd> anytime to flag/unflag.</span>
            </div>

            <button
              type="button"
              onClick={openReviewDrawer}
              className="text-white font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Review Matrix</span>
            </button>
          </div>
        </div>

        {/* Right Column: Question Navigation Grid & Stats Sidebar */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Question Matrix */}
          <QuestionNavigationGrid
            questions={questions}
            currentIndex={currentIndex}
            userAnswers={userAnswers}
            flaggedQuestionIds={flaggedQuestionIds}
            onSelectQuestion={navigateTo}
            getQuestionState={getQuestionState}
            isCollapsible={true}
            defaultExpanded={true}
          />

          {/* Exam Summary Card */}
          <div className="rounded-2xl border border-[#262626] bg-[#0a0a0a] p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Exam Overview
            </h4>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <span>Total Questions</span>
                <span className="font-mono font-bold text-white">
                  {questions.length}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <span>Answered</span>
                <span className="font-mono font-bold text-white">
                  {summary.answeredCount} ({summary.percentageAnswered}%)
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <span>Flagged for Review</span>
                <span className="font-mono font-bold text-white">
                  {summary.flaggedCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unanswered</span>
                <span className="font-mono font-bold text-neutral-400">
                  {summary.unansweredCount}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={openReviewDrawer}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review & Submit Exam</span>
            </button>
          </div>
        </div>
      </main>

      {/* Pre-Submission Review Drawer / Modal */}
      <SubmitConfirmationModal
        isOpen={isReviewDrawerOpen}
        onClose={closeReviewDrawer}
        onConfirmSubmit={submitExam}
        summary={summary}
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestionIds={flaggedQuestionIds}
        onSelectQuestion={navigateTo}
        timeRemainingFormatted={formattedTimeRemaining}
        isSubmitting={isSubmitting}
      />

      {/* Post-Submission Overlay */}
      {isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0a0a0a] rounded-3xl p-8 border border-[#262626] text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center text-white">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Exam Submitted!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Calculating topic mastery, time velocity, and diagnostic scorecard...
              </p>
            </div>

            <div className="flex justify-center py-2">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>

            {submittedSessionId && (
              <button
                type="button"
                onClick={() => router.push(`/results/${submittedSessionId}`)}
                className="w-full py-3 px-6 rounded-xl font-bold bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer text-sm"
              >
                View Diagnostic Report Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

