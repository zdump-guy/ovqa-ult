"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PrepPulseModule } from "@/types";
import { DEMO_QUIZ_MODULE, getDemoModule } from "@/lib/demo-modules";
import { getLocalCustomModules } from "@/lib/guest-session";
import { useQuizCheckpoint } from "@/lib/quiz/useQuizCheckpoint";
import { FastTimer } from "@/components/quiz/FastTimer";
import { CheckpointCard } from "@/components/quiz/CheckpointCard";
import { CheckpointSuccessOverlay } from "@/components/quiz/CheckpointSuccessOverlay";
import { CheckpointFailedModal } from "@/components/quiz/CheckpointFailedModal";
import { isMuted, toggleMute } from "@/lib/audio/sound-effects";
import {
  ArrowLeft,
  Flame,
  Volume2,
  VolumeX,
  Zap,
  Play,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizPlayerPageProps {
  params: Promise<{ moduleId: string }>;
}

export default function QuizPlayerPage({ params }: QuizPlayerPageProps) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.moduleId;
  const router = useRouter();

  const [module, setModule] = useState<PrepPulseModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundMuted, setSoundMuted] = useState(false);

  // Load module from demo pool or local custom modules
  useEffect(() => {
    let foundModule: PrepPulseModule | undefined = getDemoModule(moduleId);

    if (!foundModule) {
      const localModules = getLocalCustomModules();
      foundModule = localModules.find((m) => m.moduleId === moduleId);
    }

    if (!foundModule && moduleId.startsWith("demo-")) {
      foundModule = DEMO_QUIZ_MODULE;
    }

    // Default fallback to DEMO_QUIZ_MODULE
    setModule(foundModule || DEMO_QUIZ_MODULE);
    setLoading(false);
    setSoundMuted(isMuted());
  }, [moduleId]);

  if (loading || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-medium">Loading Quiz Challenge...</p>
        </div>
      </div>
    );
  }

  return <QuizPlayerView module={module} soundMuted={soundMuted} setSoundMuted={setSoundMuted} router={router} />;
}

interface QuizPlayerViewProps {
  module: PrepPulseModule;
  soundMuted: boolean;
  setSoundMuted: React.Dispatch<React.SetStateAction<boolean>>;
  router: ReturnType<typeof useRouter>;
}

function QuizPlayerView({
  module,
  soundMuted,
  setSoundMuted,
  router,
}: QuizPlayerViewProps) {
  const quiz = useQuizCheckpoint({
    module,
    autoStart: false,
    onFinish: (session) => {
      // Redirect to diagnostic results
      if (session.id) {
        setTimeout(() => {
          router.push(`/results/${session.id}`);
        }, 1200);
      }
    },
  });

  const handleToggleSound = () => {
    const nextMuted = toggleMute();
    setSoundMuted(nextMuted);
  };

  const checkpointPassThresholdPercent = Math.round(quiz.tierPassThreshold * 100);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-[#262626] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Back button & Module Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-base truncate text-white">
                {module.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="truncate">{module.targetSubject}</span>
                <span>•</span>
                <span className="font-mono text-white">
                  Checkpoint {quiz.currentCheckpoint} of {quiz.totalCheckpoints}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Stats & Audio Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Streak Indicator */}
            {quiz.streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#111111] border border-[#333333] rounded-full text-white font-bold text-xs font-mono">
                <Flame className="w-4 h-4 fill-white text-white" />
                <span>{quiz.streak}x Streak</span>
              </div>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={cn(
                "p-2 rounded-xl border transition-colors cursor-pointer",
                soundMuted
                  ? "bg-black border-[#333333] text-neutral-500"
                  : "bg-[#111111] border-[#333333] text-white"
              )}
              title={soundMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
            >
              {soundMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-4xl w-full mx-auto">
        {/* State 1: Ready / Intro Screen */}
        {quiz.status === "ready" && (
          <div className="w-full max-w-xl bg-[#0a0a0a] rounded-3xl p-8 md:p-10 border border-[#262626] text-center animate-scale-up">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-[#111111] border border-[#333333] text-white mb-6">
              <Zap className="w-10 h-10 fill-white text-white" />
            </div>

            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#111111] border border-[#333333] text-neutral-300 uppercase tracking-wider font-mono">
              Speed Run Challenge
            </span>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3 mb-3">
              {module.title}
            </h2>

            <p className="text-sm text-neutral-400 mb-8 max-w-md mx-auto leading-relaxed">
              {module.description ||
                "Test your cognitive recall with rapid-fire questions in 5-question tiers. You must score ≥80% on each checkpoint tier to advance."}
            </p>

            {/* Rule Badges */}
            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="text-[11px] text-neutral-500 font-medium block">Per Question</span>
                <span className="text-base font-bold text-white font-mono">
                  {quiz.timePerQuestionSeconds}s Timer
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="text-[11px] text-neutral-500 font-medium block">Checkpoint Tier</span>
                <span className="text-base font-bold text-white font-mono">
                  5 Questions
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="text-[11px] text-neutral-500 font-medium block">Pass Barrier</span>
                <span className="text-base font-bold text-white font-mono">
                  ≥{checkpointPassThresholdPercent}% Accuracy
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={quiz.startQuiz}
              className="w-full inline-flex items-center justify-center gap-2 py-4 px-8 rounded-2xl font-bold text-lg bg-white hover:bg-neutral-200 active:scale-[0.99] text-black transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black text-black" />
              <span>Start Rapid Quiz</span>
            </button>

            <p className="text-xs text-neutral-500 mt-4 font-mono">
              Keyboard navigation enabled (1-4 / A-D)
            </p>
          </div>
        )}

        {/* State 2: Running Question View */}
        {quiz.status === "running" && quiz.currentQuestion && (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Top Tier Progress & Fast Circular Timer */}
            <div className="w-full max-w-2xl flex items-center justify-between px-2">
              {/* Checkpoint Tier Indicator Dots */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-neutral-400 font-mono">
                  Tier Progress ({quiz.currentTierIndex + 1} / {quiz.currentTierQuestions.length})
                </span>
                <div className="flex items-center gap-2">
                  {quiz.currentTierQuestions.map((q, idx) => {
                    const isAnswered = q.id in quiz.checkpointAnswers;
                    const isCorrect = quiz.checkpointAnswers[q.id];
                    const isCurrent = idx === quiz.currentTierIndex;

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "w-7 h-2.5 rounded-full transition-all duration-200",
                          isCurrent && "ring-2 ring-white ring-offset-2 ring-offset-black bg-white",
                          isAnswered
                            ? isCorrect
                              ? "bg-white"
                              : "bg-neutral-600"
                            : "bg-neutral-800"
                        )}
                        title={`Question ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Circular SVG Timer */}
              <FastTimer
                timeLeft={quiz.timeLeft}
                timeFraction={quiz.timeFraction}
                totalTime={quiz.timePerQuestionSeconds}
                size={68}
                strokeWidth={5.5}
              />
            </div>

            {/* Interactive Checkpoint Card */}
            <CheckpointCard
              question={quiz.currentQuestion}
              currentIndex={quiz.currentIndex}
              totalQuestions={quiz.totalQuestions}
              streak={quiz.streak}
              onSelectOption={quiz.selectOption}
              onSubmitMultiSelect={quiz.submitMultiSelect}
            />
          </div>
        )}

        {/* State 3: Checkpoint Passed Overlay */}
        {quiz.status === "checkpoint_passed" && (
          <CheckpointSuccessOverlay
            checkpoint={quiz.currentCheckpoint}
            totalCheckpoints={quiz.totalCheckpoints}
            correctCount={quiz.currentTierCorrectCount}
            tierTotal={quiz.currentTierQuestions.length}
            accuracy={quiz.currentTierAccuracy}
            streak={quiz.streak}
            onContinue={quiz.advanceCheckpoint}
          />
        )}

        {/* State 4: Checkpoint Failed Modal */}
        {quiz.status === "checkpoint_failed" && (
          <CheckpointFailedModal
            checkpoint={quiz.currentCheckpoint}
            totalCheckpoints={quiz.totalCheckpoints}
            correctCount={quiz.currentTierCorrectCount}
            tierTotal={quiz.currentTierQuestions.length}
            accuracy={quiz.currentTierAccuracy}
            requiredAccuracy={quiz.tierPassThreshold}
            tierQuestions={quiz.currentTierQuestions}
            userAnswers={quiz.userAnswers}
            checkpointAnswers={quiz.checkpointAnswers}
            onRetryTier={quiz.retryCheckpoint}
            onRestartQuiz={quiz.restartQuiz}
          />
        )}

        {/* State 5: Finished View */}
        {quiz.status === "finished" && (
          <div className="w-full max-w-lg bg-[#0a0a0a] rounded-3xl p-8 border border-[#262626] text-center animate-scale-up">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-[#111111] border border-[#333333] text-white mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              Quiz Completed!
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              Finalizing diagnostic performance breakdown...
            </p>

            <div className="flex justify-center my-4">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>

            <button
              type="button"
              onClick={() => router.push(`/results/${quiz.sessionId}`)}
              className="mt-4 w-full py-3 px-6 rounded-xl font-bold bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer"
            >
              View Diagnostic Scorecard Now
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

