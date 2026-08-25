"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  PrepPulseModule,
  Question,
  QuestionStatus,
  DiagnosticReport,
  TestSession,
} from "@/types";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { saveGuestSession, saveGuestDiagnosticReport } from "@/lib/guest-session";

export interface ExamSessionStorageState {
  moduleId: string;
  answers: Record<string, string[]>;
  flaggedQuestionIds: string[];
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  timeSpentPerQuestion: Record<string, number>;
  isSubmitted: boolean;
  targetDeadlineTimestamp?: number;
  lastUpdated?: number;
}

export interface ReviewDrawerSummary {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  unansweredIds: string[];
  flaggedIds: string[];
  percentageAnswered: number;
}

export interface QuestionStateDetails {
  state: QuestionStatus;
  isAnswered: boolean;
  isFlagged: boolean;
  isActive: boolean;
}

export interface UseExamSessionOptions {
  autoRestore?: boolean;
  storageKeyPrefix?: string;
  onTimeExpired?: () => void;
  onSubmit?: (report: DiagnosticReport, session: Partial<TestSession>) => Promise<void> | void;
}

export interface UseExamSessionReturn {
  // State
  module: PrepPulseModule;
  questions: Question[];
  currentQuestion: Question | undefined;
  currentIndex: number;
  userAnswers: Record<string, string[]>;
  flaggedQuestionIds: Set<string>;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  formattedTimeRemaining: string;
  timeSpentPerQuestion: Record<string, number>;
  isSubmitted: boolean;
  isSubmitting: boolean;
  isTimeExpired: boolean;
  isReviewDrawerOpen: boolean;
  summary: ReviewDrawerSummary;

  // Actions
  selectOption: (questionId: string, optionId: string) => void;
  clearAnswer: (questionId: string) => void;
  toggleFlag: (questionId?: string) => boolean;
  navigateTo: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  openReviewDrawer: () => void;
  closeReviewDrawer: () => void;
  toggleReviewDrawer: () => void;
  submitExam: () => Promise<DiagnosticReport>;
  resetExam: () => void;
  tickSecond: () => void;

  // Helpers
  getQuestionState: (questionId: string) => QuestionStateDetails;
  getQuestionStatus: (questionId: string) => QuestionStatus;
  getReviewDrawerSummary: () => ReviewDrawerSummary;
}

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function useExamSession(
  module: PrepPulseModule,
  options: UseExamSessionOptions = {}
): UseExamSessionReturn {
  const {
    autoRestore = true,
    storageKeyPrefix = "preppulse_exam_session_",
    onTimeExpired,
    onSubmit,
  } = options;

  const storageKey = `${storageKeyPrefix}${module.moduleId || "default"}`;
  const questions = useMemo(() => module.questions || [], [module.questions]);
  const totalDurationSeconds = useMemo(() => {
    const durationMin = module.config?.examConfig?.totalDurationMinutes || 60;
    return durationMin * 60;
  }, [module.config?.examConfig?.totalDurationMinutes]);

  // Core State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(totalDurationSeconds);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState<boolean>(false);

  // References for up-to-date state across synchronous calls, intervals and callbacks
  const stateRef = useRef({
    currentIndex,
    userAnswers,
    flaggedQuestionIds,
    timeRemainingSeconds,
    timeSpentPerQuestion,
    isSubmitted,
    isSubmitting,
    isTimeExpired,
  });

  // Persist State to LocalStorage helper
  const persistState = useCallback(
    (overrides?: Partial<ExamSessionStorageState>) => {
      if (typeof window === "undefined") return;
      try {
        const current = stateRef.current;
        const answers = overrides?.answers ?? current.userAnswers;
        const flaggedIds = overrides?.flaggedQuestionIds ?? Array.from(current.flaggedQuestionIds);
        const curIdx = overrides?.currentQuestionIndex ?? current.currentIndex;
        const remaining = overrides?.timeRemainingSeconds ?? current.timeRemainingSeconds;
        const times = overrides?.timeSpentPerQuestion ?? current.timeSpentPerQuestion;
        const submitted = overrides?.isSubmitted ?? current.isSubmitted;

        const stateToSave: ExamSessionStorageState = {
          moduleId: module.moduleId || "default",
          answers,
          flaggedQuestionIds: flaggedIds,
          currentQuestionIndex: curIdx,
          timeRemainingSeconds: remaining,
          totalDurationSeconds,
          timeSpentPerQuestion: times,
          isSubmitted: submitted,
          targetDeadlineTimestamp: Date.now() + remaining * 1000,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn("Failed to persist exam state to localStorage:", err);
      }
    },
    [module.moduleId, storageKey, totalDurationSeconds]
  );

  // LocalStorage Crash Recovery / Initial Hydration
  useEffect(() => {
    if (!autoRestore || typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      if (parsed.answers && typeof parsed.answers === "object") {
        stateRef.current.userAnswers = parsed.answers;
        setUserAnswers(parsed.answers);
      }

      if (Array.isArray(parsed.flaggedQuestionIds)) {
        const flagSet = new Set<string>(parsed.flaggedQuestionIds);
        stateRef.current.flaggedQuestionIds = flagSet;
        setFlaggedQuestionIds(flagSet);
      }

      if (
        typeof parsed.currentQuestionIndex === "number" &&
        parsed.currentQuestionIndex >= 0 &&
        parsed.currentQuestionIndex < questions.length
      ) {
        stateRef.current.currentIndex = parsed.currentQuestionIndex;
        setCurrentIndex(parsed.currentQuestionIndex);
      }

      if (parsed.timeSpentPerQuestion && typeof parsed.timeSpentPerQuestion === "object") {
        stateRef.current.timeSpentPerQuestion = parsed.timeSpentPerQuestion;
        setTimeSpentPerQuestion(parsed.timeSpentPerQuestion);
      }

      if (parsed.isSubmitted) {
        stateRef.current.isSubmitted = true;
        setIsSubmitted(true);
      }

      // Calculate accurate remaining time based on timestamp if available
      if (typeof parsed.timeRemainingSeconds === "number") {
        if (parsed.isSubmitted) {
          stateRef.current.timeRemainingSeconds = parsed.timeRemainingSeconds;
          setTimeRemainingSeconds(parsed.timeRemainingSeconds);
        } else if (parsed.targetDeadlineTimestamp && typeof parsed.targetDeadlineTimestamp === "number") {
          const diffSeconds = Math.round((parsed.targetDeadlineTimestamp - Date.now()) / 1000);
          const computedRemaining = Math.max(0, diffSeconds);
          stateRef.current.timeRemainingSeconds = computedRemaining;
          setTimeRemainingSeconds(computedRemaining);
          if (computedRemaining <= 0) {
            stateRef.current.isTimeExpired = true;
            stateRef.current.isSubmitted = true;
            setIsTimeExpired(true);
            setIsSubmitted(true);
          }
        } else {
          stateRef.current.timeRemainingSeconds = Math.max(0, parsed.timeRemainingSeconds);
          setTimeRemainingSeconds(Math.max(0, parsed.timeRemainingSeconds));
        }
      }
    } catch (err) {
      console.warn("Failed to restore exam session from localStorage:", err);
    }
  }, [autoRestore, storageKey, questions.length]);

  // Navigate to Question
  const navigateTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) {
        throw new Error(`Invalid navigation index ${index}`);
      }
      stateRef.current.currentIndex = index;
      setCurrentIndex(index);
      persistState({ currentQuestionIndex: index });
    },
    [questions.length, persistState]
  );

  const nextQuestion = useCallback(() => {
    const cur = stateRef.current.currentIndex;
    if (cur < questions.length - 1) {
      navigateTo(cur + 1);
    }
  }, [questions.length, navigateTo]);

  const prevQuestion = useCallback(() => {
    const cur = stateRef.current.currentIndex;
    if (cur > 0) {
      navigateTo(cur - 1);
    }
  }, [navigateTo]);

  // Option Selection
  const selectOption = useCallback(
    (questionId: string, optionId: string) => {
      if (stateRef.current.isSubmitted) {
        throw new Error("Exam already submitted");
      }

      const question = questions.find((q) => q.id === questionId);
      if (!question) {
        throw new Error(`Question ${questionId} not found`);
      }

      const prev = stateRef.current.userAnswers;
      let updatedAnswers: string[];

      if (question.type === "multi_select") {
        const current = prev[questionId] || [];
        if (current.includes(optionId)) {
          updatedAnswers = current.filter((id) => id !== optionId);
        } else {
          updatedAnswers = [...current, optionId];
        }
      } else {
        // single-choice or true_false replaces selection
        updatedAnswers = [optionId];
      }

      const newMap = {
        ...prev,
        [questionId]: updatedAnswers,
      };

      stateRef.current.userAnswers = newMap;
      setUserAnswers(newMap);
      persistState({ answers: newMap });
    },
    [questions, persistState]
  );

  // Clear Answer
  const clearAnswer = useCallback(
    (questionId: string) => {
      if (stateRef.current.isSubmitted) {
        throw new Error("Exam already submitted");
      }

      const prev = stateRef.current.userAnswers;
      const newMap = { ...prev };
      delete newMap[questionId];

      stateRef.current.userAnswers = newMap;
      setUserAnswers(newMap);
      persistState({ answers: newMap });
    },
    [persistState]
  );

  // Flag Toggle
  const toggleFlag = useCallback(
    (questionId?: string): boolean => {
      if (stateRef.current.isSubmitted) {
        throw new Error("Exam already submitted");
      }

      const targetId = questionId || questions[stateRef.current.currentIndex]?.id;
      if (!targetId) return false;

      const prevSet = stateRef.current.flaggedQuestionIds;
      const nextSet = new Set(prevSet);
      let isNowFlagged = false;

      if (nextSet.has(targetId)) {
        nextSet.delete(targetId);
        isNowFlagged = false;
      } else {
        nextSet.add(targetId);
        isNowFlagged = true;
      }

      stateRef.current.flaggedQuestionIds = nextSet;
      setFlaggedQuestionIds(nextSet);
      persistState({ flaggedQuestionIds: Array.from(nextSet) });
      return isNowFlagged;
    },
    [questions, persistState]
  );

  // Drawer Controls
  const openReviewDrawer = useCallback(() => setIsReviewDrawerOpen(true), []);
  const closeReviewDrawer = useCallback(() => setIsReviewDrawerOpen(false), []);
  const toggleReviewDrawer = useCallback(
    () => setIsReviewDrawerOpen((prev) => !prev),
    []
  );

  // Calculate Summary
  const getReviewDrawerSummary = useCallback((): ReviewDrawerSummary => {
    const unansweredIds: string[] = [];
    const flaggedIds = Array.from(flaggedQuestionIds);

    for (const q of questions) {
      const ans = userAnswers[q.id];
      if (!ans || ans.length === 0) {
        unansweredIds.push(q.id);
      }
    }

    const answeredCount = questions.length - unansweredIds.length;
    const percentageAnswered =
      questions.length > 0
        ? Math.round((answeredCount / questions.length) * 100)
        : 0;

    return {
      totalQuestions: questions.length,
      answeredCount,
      unansweredCount: unansweredIds.length,
      flaggedCount: flaggedIds.length,
      unansweredIds,
      flaggedIds,
      percentageAnswered,
    };
  }, [questions, userAnswers, flaggedQuestionIds]);

  // Question State Details (4-State logic)
  const getQuestionState = useCallback(
    (questionId: string): QuestionStateDetails => {
      const current = stateRef.current;
      const ans = current.userAnswers[questionId];
      const isAnswered = Boolean(ans && ans.length > 0);
      const isFlagged = current.flaggedQuestionIds.has(questionId);
      const isActive = questions[current.currentIndex]?.id === questionId;

      let state: QuestionStatus = "unanswered";
      if (isActive) {
        state = "active";
      } else if (isAnswered) {
        state = "answered";
      } else if (isFlagged) {
        state = "flagged";
      }

      return { state, isAnswered, isFlagged, isActive };
    },
    [questions]
  );

  const getQuestionStatus = useCallback(
    (questionId: string): QuestionStatus => {
      return getQuestionState(questionId).state;
    },
    [getQuestionState]
  );

  // Submit Exam
  const submitExam = useCallback(async (): Promise<DiagnosticReport> => {
    stateRef.current.isSubmitting = true;
    stateRef.current.isSubmitted = true;
    setIsSubmitting(true);
    setIsSubmitted(true);
    setIsReviewDrawerOpen(false);

    const current = stateRef.current;
    const totalTimeSpentSeconds = Math.max(0, totalDurationSeconds - current.timeRemainingSeconds);

    persistState({
      isSubmitted: true,
      timeRemainingSeconds: current.timeRemainingSeconds,
    });

    const passingPercentage = module.config?.examConfig?.passingScorePercentage ?? 60;

    const report = calculateDiagnosticReport({
      module,
      questions,
      userAnswers: current.userAnswers,
      questionTimes: current.timeSpentPerQuestion,
      totalTimeSpentSeconds,
      passThresholdPercentage: passingPercentage,
    });

    const sessionPayload: Partial<TestSession> = {
      moduleId: module.moduleId || "default",
      sessionType: "exam",
      status: report.passed ? "passed" : "failed",
      totalQuestions: questions.length,
      correctAnswers: report.correctCount,
      scorePercentage: report.scorePercentage,
      timeSpentSeconds: totalTimeSpentSeconds,
      checkpointReached: 1,
      breakdown: report,
      completedAt: new Date().toISOString(),
    };

    // Save locally for guest resilience
    const sessionId = `exam_sess_${module.moduleId || "mod"}_${Date.now()}`;
    saveGuestSession(sessionId, { ...sessionPayload, id: sessionId });
    saveGuestDiagnosticReport(sessionId, report);

    if (onSubmit) {
      try {
        await onSubmit(report, { ...sessionPayload, id: sessionId });
      } catch (err) {
        console.warn("Error in custom onSubmit handler:", err);
      }
    }

    stateRef.current.isSubmitting = false;
    setIsSubmitting(false);
    return report;
  }, [module, questions, totalDurationSeconds, persistState, onSubmit]);

  // Tick 1 second
  const tickSecond = useCallback(() => {
    const current = stateRef.current;
    if (current.isSubmitted || current.isTimeExpired) return;

    if (current.timeRemainingSeconds <= 1) {
      stateRef.current.timeRemainingSeconds = 0;
      stateRef.current.isTimeExpired = true;
      setTimeRemainingSeconds(0);
      setIsTimeExpired(true);
      if (onTimeExpired) onTimeExpired();
      submitExam();
    } else {
      const nextRemaining = current.timeRemainingSeconds - 1;
      stateRef.current.timeRemainingSeconds = nextRemaining;
      setTimeRemainingSeconds(nextRemaining);

      const currentQId = questions[current.currentIndex]?.id;
      if (currentQId) {
        const updatedTimes = {
          ...current.timeSpentPerQuestion,
          [currentQId]: (current.timeSpentPerQuestion[currentQId] || 0) + 1,
        };
        stateRef.current.timeSpentPerQuestion = updatedTimes;
        setTimeSpentPerQuestion(updatedTimes);
        persistState({
          timeRemainingSeconds: nextRemaining,
          timeSpentPerQuestion: updatedTimes,
        });
      } else {
        persistState({ timeRemainingSeconds: nextRemaining });
      }
    }
  }, [questions, onTimeExpired, submitExam, persistState]);

  // Reset Exam
  const resetExam = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
    }
    stateRef.current = {
      currentIndex: 0,
      userAnswers: {} as Record<string, string[]>,
      flaggedQuestionIds: new Set<string>(),
      timeRemainingSeconds: totalDurationSeconds,
      timeSpentPerQuestion: {} as Record<string, number>,
      isSubmitted: false,
      isSubmitting: false,
      isTimeExpired: false,
    };
    setCurrentIndex(0);
    setUserAnswers({});
    setFlaggedQuestionIds(new Set());
    setTimeRemainingSeconds(totalDurationSeconds);
    setTimeSpentPerQuestion({});
    setIsSubmitted(false);
    setIsSubmitting(false);
    setIsTimeExpired(false);
    setIsReviewDrawerOpen(false);
  }, [storageKey, totalDurationSeconds]);

  // Countdown Timer Interval
  useEffect(() => {
    if (isSubmitted || isTimeExpired) return;

    const intervalId = setInterval(() => {
      tickSecond();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isSubmitted, isTimeExpired, tickSecond]);

  // Keyboard Shortcuts (F to toggle flag)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing in form inputs
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFlag();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFlag]);

  const currentQuestion = questions[currentIndex];
  const summary = useMemo(() => getReviewDrawerSummary(), [getReviewDrawerSummary]);

  return {
    module,
    questions,
    currentQuestion,
    currentIndex,
    userAnswers,
    flaggedQuestionIds,
    timeRemainingSeconds,
    totalDurationSeconds,
    formattedTimeRemaining: formatDuration(timeRemainingSeconds),
    timeSpentPerQuestion,
    isSubmitted,
    isSubmitting,
    isTimeExpired,
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
    toggleReviewDrawer,
    submitExam,
    resetExam,
    tickSecond,
    getQuestionState,
    getQuestionStatus,
    getReviewDrawerSummary,
  };
}
