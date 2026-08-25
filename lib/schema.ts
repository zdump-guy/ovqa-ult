import { z } from "zod";

// Option within a question
export const QuestionOptionZodSchema = z.object({
  id: z.string().min(1, "Option ID cannot be empty"),
  text: z.string().min(1, "Option text cannot be empty"),
});

// Single Question Schema
export const QuestionZodSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  type: z.enum(["multiple_choice", "multi_select", "true_false"]),
  checkpoint: z.number().int().positive().default(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string().min(1, "Question prompt is required"),
  options: z
    .array(QuestionOptionZodSchema)
    .min(2, "Questions must have at least 2 options"),
  correctOptionIds: z
    .array(z.string())
    .min(1, "At least one correct option must be specified"),
  explanation: z.string().min(1, "Explanation is required"),
  sourceReference: z.string().optional(),
});

// Rapid Checkpoint Quiz Configuration
export const QuizConfigZodSchema = z.object({
  checkpointInterval: z.number().int().positive().default(5),
  timePerQuestionSeconds: z.number().int().positive().default(15),
  checkpointPassThreshold: z.number().min(0).max(1).default(0.8),
  enableStreakBonus: z.boolean().default(true),
});

// Mock Exam Configuration
export const ExamConfigZodSchema = z.object({
  totalDurationMinutes: z.number().int().positive().default(60),
  passingScorePercentage: z.number().min(0).max(100).default(60),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  allowReview: z.boolean().default(true),
});

// Module-level Configuration Wrapper
export const ModuleConfigZodSchema = z.object({
  quizConfig: QuizConfigZodSchema.optional(),
  examConfig: ExamConfigZodSchema.optional(),
});

// Canonical PrepPulse Module Schema
export const ModuleZodSchema = z.object({
  moduleId: z.string().optional(),
  title: z.string().min(1, "Module title is required"),
  description: z.string().default(""),
  moduleType: z.enum(["quiz", "exam"]),
  targetSubject: z.string().min(1, "Target subject is required"),
  course: z.string().optional(),
  createdAt: z.string().optional(),
  config: ModuleConfigZodSchema.default({}),
  questions: z
    .array(QuestionZodSchema)
    .min(1, "Module must contain at least one question"),
});

// Diagnostic & Review Schemas
export const TopicMasteryZodSchema = z.object({
  topic: z.string(),
  total: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  status: z.enum(["mastered", "competent", "weak_spot"]),
});

export const DifficultyAccuracyItemZodSchema = z.object({
  total: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const DifficultyAccuracyZodSchema = z.object({
  easy: DifficultyAccuracyItemZodSchema,
  medium: DifficultyAccuracyItemZodSchema,
  hard: DifficultyAccuracyItemZodSchema,
});

export const QuestionReviewZodSchema = z.object({
  question: QuestionZodSchema,
  userSelectedOptionIds: z.array(z.string()),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().nonnegative(),
  explanation: z.string(),
  sourceReference: z.string().optional(),
});

export const DiagnosticReportZodSchema = z.object({
  totalQuestions: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  scorePercentage: z.number().min(0).max(100),
  passed: z.boolean(),
  totalTimeSpentSeconds: z.number().nonnegative(),
  averagePaceSeconds: z.number().nonnegative(),
  topicMastery: z.array(TopicMasteryZodSchema),
  difficultyAccuracy: DifficultyAccuracyZodSchema,
  timeTraps: z.array(z.string()),
  rushedErrors: z.array(z.string()),
  missedQuestionIds: z.array(z.string()),
  questionReviews: z.array(QuestionReviewZodSchema),
});

// Test Session Record Schema
export const TestSessionZodSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  moduleId: z.string(),
  sessionType: z.enum(["quiz", "exam"]),
  status: z.enum(["in_progress", "passed", "failed", "completed"]),
  totalQuestions: z.number().int().positive(),
  correctAnswers: z.number().int().nonnegative().default(0),
  scorePercentage: z.number().min(0).max(100).default(0),
  timeSpentSeconds: z.number().int().nonnegative().default(0),
  checkpointReached: z.number().int().nonnegative().default(0),
  breakdown: DiagnosticReportZodSchema.optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

// Helper validation functions
export function validateModule(data: unknown) {
  return ModuleZodSchema.safeParse(data);
}

export function parseModule(data: unknown) {
  return ModuleZodSchema.parse(data);
}
