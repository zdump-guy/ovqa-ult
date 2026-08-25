"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DiagnosticReport,
  PrepPulseModule,
  Question,
  QuizConfig,
  QuizEngineStatus,
  TestSession,
} from "@/types";
import {
  shuffleCheckpointTier,
  shuffleQuizQuestions,
} from "./shuffle";
import {
  playCheckpointUnlock,
  playCorrect,
  playTick,
  playWarningTick,
  playWrong,
} from "@/lib/audio/sound-effects";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { saveGuestDiagnosticReport, saveGuestSession } from "@/lib/guest-session";

export interface UseQuizCheckpointOptions {
  module: PrepPulseModule;
  config?: Partial<QuizConfig>;
  sessionId?: string;
  autoStart?: boolean;
  onCheckpointPass?: (checkpoint: number, score: number, accuracy: number) => void;
  onCheckpointFail?: (checkpoint: number, score: number, accuracy: number) => void;
  onFinish?: (session: Partial<TestSession>, report: DiagnosticReport) => void;
}

export function useQuizCheckpoint({
  module,
  config: userConfig,
  sessionId: customSessionId,
  autoStart = false,
  onCheckpointPass,
  onCheckpointFail: _onCheckpointFail,
  onFinish,
}: UseQuizCheckpointOptions) {
  // Merge module-level config with user overrides & defaults
  const checkpointInterval =
    userConfig?.checkpointInterval ??
    module.config?.quizConfig?.checkpointInterval ??
    5;
  const timePerQuestionSeconds =
    userConfig?.timePerQuestionSeconds ??
    module.config?.quizConfig?.timePerQuestionSeconds ??
    15;
  const checkpointPassThreshold =
    userConfig?.checkpointPassThreshold ??
    module.config?.quizConfig?.checkpointPassThreshold ??
    0.8;
  const enableStreakBonus =
    userConfig?.enableStreakBonus ??
    module.config?.quizConfig?.enableStreakBonus ??
    true;

  const sessionId = useMemo(
    () =>
      customSessionId ||
      `quiz_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    [customSessionId]
  );

  // Initialize questions with Fisher-Yates shuffle preserving checkpoint tiers
  const [questions, setQuestions] = useState<Question[]>(() =>
    shuffleQuizQuestions(module.questions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      preserveCheckpoints: true,
    })
  );

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [status, setStatus] = useState<QuizEngineStatus>(
    autoStart ? "running" : "ready"
  );
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, boolean>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  const [timeLeft, setTimeLeft] = useState<number>(timePerQuestionSeconds);
  const [timeFraction, setTimeFraction] = useState<number>(1.0);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);

  // Timing refs with wall-clock drift protection
  const questionStartTimeRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSecondTickedRef = useRef<number>(-1);
  const isSubmittingRef = useRef<boolean>(false);
  const quizStartTimeRef = useRef<number>(0);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  // Checkpoint tier calculations
  const totalCheckpoints = Math.max(
    1,
    Math.ceil(totalQuestions / checkpointInterval)
  );
  const currentCheckpoint = Math.min(
    totalCheckpoints,
    Math.floor(currentIndex / checkpointInterval) + 1
  );
  const tierStartIndex = (currentCheckpoint - 1) * checkpointInterval;
  const tierEndIndex = Math.min(
    tierStartIndex + checkpointInterval,
    totalQuestions
  );
  const currentTierQuestions = questions.slice(tierStartIndex, tierEndIndex);
  const currentTierIndex = currentIndex - tierStartIndex;

  // Compute current tier accuracy and answers
  const currentTierResults = currentTierQuestions.map((q) => ({
    questionId: q.id,
    answered: q.id in checkpointAnswers,
    isCorrect: !!checkpointAnswers[q.id],
  }));

  const currentTierAnsweredCount = currentTierResults.filter((r) => r.answered).length;
  const currentTierCorrectCount = currentTierResults.filter((r) => r.isCorrect).length;
  const currentTierAccuracy =
    currentTierQuestions.length > 0
      ? currentTierCorrectCount / currentTierQuestions.length
      : 0;
  const isTierPassed = currentTierAccuracy >= checkpointPassThreshold;

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Finalize quiz session
  const finalizeQuiz = useCallback(
    (
      finalUserAnswers: Record<string, string[]>,
      finalQuestionTimes: Record<string, number>,
      finalScore: number
    ) => {
      clearTimer();
      setStatus("finished");

      const totalTimeSpentSeconds =
        quizStartTimeRef.current > 0
          ? Math.max(1, Math.round((Date.now() - quizStartTimeRef.current) / 1000))
          : Object.values(finalQuestionTimes).reduce((acc, t) => acc + t, 0);

      const report = calculateDiagnosticReport({
        module,
        questions,
        userAnswers: finalUserAnswers,
        questionTimes: finalQuestionTimes,
        totalTimeSpentSeconds,
        passThresholdPercentage: Math.round(checkpointPassThreshold * 100),
      });

      setDiagnosticReport(report);

      const sessionRecord: Partial<TestSession> = {
        id: sessionId,
        moduleId: module.moduleId || "demo-quiz-1",
        sessionType: "quiz",
        status: report.passed ? "passed" : "completed",
        totalQuestions,
        correctAnswers: finalScore,
        scorePercentage: report.scorePercentage,
        timeSpentSeconds: totalTimeSpentSeconds,
        checkpointReached: totalCheckpoints,
        breakdown: report,
        completedAt: new Date().toISOString(),
      };

      // Persist to guest storage
      saveGuestSession(sessionId, sessionRecord);
      saveGuestDiagnosticReport(sessionId, report);

      if (onFinish) {
        onFinish(sessionRecord, report);
      }
    },
    [
      clearTimer,
      module,
      questions,
      checkpointPassThreshold,
      sessionId,
      totalQuestions,
      totalCheckpoints,
      onFinish,
    ]
  );

  // Submit Answer Logic (or Timeout)
  const processAnswer = useCallback(
    (selectedOptionIds: string[], isTimeout = false) => {
      if (isSubmittingRef.current || status !== "running" || !currentQuestion) {
        return;
      }

      isSubmittingRef.current = true;
      clearTimer();

      // Calculate time spent with drift protection
      const now = performance.now();
      const elapsedSeconds =
        questionStartTimeRef.current > 0
          ? Math.max(
              1,
              Math.min(
                timePerQuestionSeconds,
                Math.round((now - questionStartTimeRef.current) / 1000)
              )
            )
          : isTimeout
          ? timePerQuestionSeconds
          : 1;

      // Evaluate correctness
      const correctOptionIds = currentQuestion.correctOptionIds || [];
      const isCorrect =
        !isTimeout &&
        selectedOptionIds.length === correctOptionIds.length &&
        selectedOptionIds.length > 0 &&
        selectedOptionIds.every((id) => correctOptionIds.includes(id));

      const updatedUserAnswers = {
        ...userAnswers,
        [currentQuestion.id]: selectedOptionIds,
      };
      const updatedCheckpointAnswers = {
        ...checkpointAnswers,
        [currentQuestion.id]: isCorrect,
      };
      const updatedQuestionTimes = {
        ...questionTimes,
        [currentQuestion.id]: elapsedSeconds,
      };

      setUserAnswers(updatedUserAnswers);
      setCheckpointAnswers(updatedCheckpointAnswers);
      setQuestionTimes(updatedQuestionTimes);

      // Score & streak calculations
      let newScore = score;
      let newStreak = streak;

      if (!isCorrect) {
        // Sudden-Death: Wrong answer or timeout immediately drops back to Question 1 of the current checkpoint tier
        setStreak(0);
        playWrong();

        // Reshuffle questions and options in the current tier to prevent rote memorization
        const reshuffledTier = shuffleCheckpointTier(currentTierQuestions, true);
        setQuestions((prev) => {
          const next = [...prev];
          next.splice(tierStartIndex, currentTierQuestions.length, ...reshuffledTier);
          return next;
        });

        // Reset answers for the current tier
        setCheckpointAnswers((prev) => {
          const next = { ...prev };
          for (const q of currentTierQuestions) {
            delete next[q.id];
          }
          return next;
        });

        // Drop back to start of current checkpoint tier
        setCurrentIndex(tierStartIndex);
        isSubmittingRef.current = false;
        return;
      }

      // If correct:
      newStreak = streak + 1;
      const streakMultiplier =
        enableStreakBonus && newStreak >= 3 ? 1.5 : 1.0;
      newScore = score + (streakMultiplier > 1 ? 2 : 1);
      setStreak(newStreak);
      setMaxStreak((prev) => Math.max(prev, newStreak));
      setScore(newScore);
      playCorrect();

      // Check if current question is the last in the tier
      const isTierEnd =
        currentIndex + 1 === tierEndIndex || currentIndex + 1 === totalQuestions;

      if (isTierEnd) {
        const isFinalQuestionOfQuiz = currentIndex + 1 >= totalQuestions;
        if (isFinalQuestionOfQuiz) {
          playCheckpointUnlock();
          finalizeQuiz(updatedUserAnswers, updatedQuestionTimes, newScore);
        } else {
          playCheckpointUnlock();
          setStatus("checkpoint_passed");
          if (onCheckpointPass) {
            onCheckpointPass(currentCheckpoint, newScore, 1.0);
          }
        }
        isSubmittingRef.current = false;
      } else {
        // Move to next question in tier
        setCurrentIndex((prev) => prev + 1);
        isSubmittingRef.current = false;
      }
    },
    [
      status,
      currentQuestion,
      clearTimer,
      timePerQuestionSeconds,
      userAnswers,
      checkpointAnswers,
      questionTimes,
      score,
      streak,
      enableStreakBonus,
      currentIndex,
      tierStartIndex,
      tierEndIndex,
      totalQuestions,
      currentTierQuestions,
      finalizeQuiz,
      onCheckpointPass,
      currentCheckpoint,
    ]
  );

  // Timeout handler
  const handleTimeout = useCallback(() => {
    processAnswer([], true);
  }, [processAnswer]);

  // Start question timer with high-precision wall-clock drift compensation
  const startQuestionTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(timePerQuestionSeconds);
    setTimeFraction(1.0);
    lastSecondTickedRef.current = timePerQuestionSeconds;
    isSubmittingRef.current = false;

    const startPerf = performance.now();
    questionStartTimeRef.current = startPerf;
    targetEndTimeRef.current = startPerf + timePerQuestionSeconds * 1000;

    timerIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const remainingMs = Math.max(0, targetEndTimeRef.current - now);
      const remainingFraction = Math.max(
        0,
        Math.min(1, remainingMs / (timePerQuestionSeconds * 1000))
      );
      const remainingSec = Math.ceil(remainingMs / 1000);

      setTimeFraction(remainingFraction);
      setTimeLeft(remainingSec);

      // Sound ticks on second transitions
      if (
        remainingSec !== lastSecondTickedRef.current &&
        remainingSec > 0 &&
        remainingSec <= timePerQuestionSeconds
      ) {
        lastSecondTickedRef.current = remainingSec;
        if (remainingSec <= 3) {
          playWarningTick();
        } else {
          playTick();
        }
      }

      if (remainingMs <= 0) {
        clearTimer();
        handleTimeout();
      }
    }, 40); // 40ms (~25fps) for smooth gauge animation and low CPU
  }, [clearTimer, timePerQuestionSeconds, handleTimeout]);

  // Monitor status / question index transitions to run timer
  useEffect(() => {
    if (status === "running") {
      startQuestionTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [status, currentIndex, startQuestionTimer, clearTimer]);

  // Actions
  const startQuiz = useCallback(() => {
    quizStartTimeRef.current = Date.now();
    const shuffled = shuffleQuizQuestions(module.questions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      preserveCheckpoints: true,
    });
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setUserAnswers({});
    setCheckpointAnswers({});
    setQuestionTimes({});
    setDiagnosticReport(null);
    setStatus("running");
  }, [module.questions]);

  const selectOption = useCallback(
    (optionId: string) => {
      processAnswer([optionId], false);
    },
    [processAnswer]
  );

  const submitMultiSelect = useCallback(
    (optionIds: string[]) => {
      processAnswer(optionIds, false);
    },
    [processAnswer]
  );

  const advanceCheckpoint = useCallback(() => {
    if (status !== "checkpoint_passed") return;
    setCurrentIndex((prev) => prev + 1);
    setStatus("running");
  }, [status]);

  const retryCheckpoint = useCallback(() => {
    if (status !== "checkpoint_failed") return;

    // Reshuffle questions in the failed tier
    const reshuffledTier = shuffleCheckpointTier(currentTierQuestions, true);
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(tierStartIndex, currentTierQuestions.length, ...reshuffledTier);
      return next;
    });

    // Clear answers for the failed tier only
    setUserAnswers((prev) => {
      const next = { ...prev };
      for (const q of currentTierQuestions) {
        delete next[q.id];
      }
      return next;
    });

    setCheckpointAnswers((prev) => {
      const next = { ...prev };
      for (const q of currentTierQuestions) {
        delete next[q.id];
      }
      return next;
    });

    setQuestionTimes((prev) => {
      const next = { ...prev };
      for (const q of currentTierQuestions) {
        delete next[q.id];
      }
      return next;
    });

    setStreak(0);
    setCurrentIndex(tierStartIndex);
    setStatus("running");
  }, [status, currentTierQuestions, tierStartIndex]);

  const pauseQuiz = useCallback(() => {
    if (status === "running") {
      clearTimer();
      setStatus("ready");
    }
  }, [status, clearTimer]);

  const resumeQuiz = useCallback(() => {
    if (status === "ready") {
      setStatus("running");
    }
  }, [status]);

  const restartQuiz = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  return {
    // State
    status,
    questions,
    currentQuestion,
    currentIndex,
    totalQuestions,
    currentCheckpoint,
    totalCheckpoints,
    tierStartIndex,
    tierEndIndex,
    currentTierIndex,
    currentTierQuestions,
    currentTierResults,
    currentTierAnsweredCount,
    currentTierCorrectCount,
    currentTierAccuracy,
    isTierPassed,
    tierPassThreshold: checkpointPassThreshold,
    timeLeft,
    timeFraction,
    timePerQuestionSeconds,
    streak,
    maxStreak,
    score,
    userAnswers,
    checkpointAnswers,
    questionTimes,
    diagnosticReport,
    sessionId,

    // Actions
    startQuiz,
    selectOption,
    submitMultiSelect,
    submitAnswer: processAnswer,
    handleTimeout,
    advanceCheckpoint,
    retryCheckpoint,
    pauseQuiz,
    resumeQuiz,
    restartQuiz,
  };
}
