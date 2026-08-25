import { z } from "zod";
import {
  QuestionOptionZodSchema,
  QuestionZodSchema,
  QuizConfigZodSchema,
  ExamConfigZodSchema,
  ModuleConfigZodSchema,
  ModuleZodSchema,
  TopicMasteryZodSchema,
  DifficultyAccuracyZodSchema,
  QuestionReviewZodSchema,
  DiagnosticReportZodSchema,
  TestSessionZodSchema,
} from "@/lib/schema";

// Inferred TypeScript Types
export type QuestionOption = z.infer<typeof QuestionOptionZodSchema>;
export type Question = z.infer<typeof QuestionZodSchema>;
export type QuestionType = Question["type"];
export type QuestionDifficulty = Question["difficulty"];

export type QuizConfig = z.infer<typeof QuizConfigZodSchema>;
export type ExamConfig = z.infer<typeof ExamConfigZodSchema>;
export type ModuleConfig = z.infer<typeof ModuleConfigZodSchema>;

export type PrepPulseModule = z.infer<typeof ModuleZodSchema>;
export type ModuleType = PrepPulseModule["moduleType"];

export type TopicMastery = z.infer<typeof TopicMasteryZodSchema>;
export type DifficultyAccuracy = z.infer<typeof DifficultyAccuracyZodSchema>;
export type QuestionReview = z.infer<typeof QuestionReviewZodSchema>;
export type DiagnosticReport = z.infer<typeof DiagnosticReportZodSchema>;

export type TestSession = z.infer<typeof TestSessionZodSchema>;
export type TestSessionStatus = TestSession["status"];
export type TestSessionType = TestSession["sessionType"];

// User Profile Type
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt?: string;
}

// Player / Quiz Checkpoint State Interfaces
export type QuizEngineStatus =
  | "ready"
  | "running"
  | "checkpoint_failed"
  | "checkpoint_passed"
  | "finished";

export interface QuizCheckpointState {
  currentQuestion: Question | undefined;
  currentIndex: number;
  totalQuestions: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  timeLeft: number;
  status: QuizEngineStatus;
  streak: number;
  score: number;
  checkpointAnswers: Record<string, boolean>;
  userAnswers: Record<string, string[]>;
  questionTimes: Record<string, number>;
}

// Exam Navigation State
export type QuestionStatus = "unanswered" | "answered" | "flagged" | "active";

export interface ExamSessionState {
  currentIndex: number;
  userAnswers: Record<string, string[]>;
  flaggedQuestionIds: Set<string>;
  questionTimes: Record<string, number>;
  totalSecondsRemaining: number;
  isSubmitting: boolean;
  isReviewDrawerOpen: boolean;
}
