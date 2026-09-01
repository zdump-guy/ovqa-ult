/**
 * PrepPulse Mock State & Algorithmic Engines
 * Zero-dependency pure implementations of core platform engines for opaque-box testing.
 */

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: "multiple_choice" | "multi_select" | "true_false";
  checkpoint: number;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string;
  sourceReference?: string;
  topic?: string;
}

export interface QuizConfig {
  checkpointInterval: number; // default: 5
  timePerQuestionSeconds: number; // default: 15
  checkpointPassThreshold: number; // default: 0.8
  enableStreakBonus?: boolean; // default: true
}

export interface ExamConfig {
  totalDurationMinutes: number; // default: 60
  passingScorePercentage: number; // default: 60
  shuffleQuestions?: boolean; // default: true
  shuffleOptions?: boolean; // default: true
  allowReview?: boolean; // default: true
}

export interface PrepPulseModule {
  moduleId?: string;
  title: string;
  description: string;
  moduleType: "quiz" | "exam";
  targetSubject: string;
  course?: string;
  createdAt?: string;
  isProtected?: boolean; // for demo modules that cannot be deleted
  config: {
    quizConfig?: QuizConfig;
    examConfig?: ExamConfig;
  };
  questions: Question[];
}

export interface DiagnosticReport {
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  passed: boolean;
  totalTimeSpentSeconds: number;
  averagePaceSeconds: number;
  topicMastery: Array<{
    topic: string;
    total: number;
    correct: number;
    percentage: number;
    status: "mastered" | "competent" | "weak_spot";
  }>;
  difficultyAccuracy: {
    easy: { total: number; correct: number; percentage: number };
    medium: { total: number; correct: number; percentage: number };
    hard: { total: number; correct: number; percentage: number };
  };
  timeTraps: string[]; // Question IDs where time > 2 * avg and incorrect
  rushedErrors: string[]; // Question IDs where time < 0.5 * avg and incorrect
  missedQuestionIds: string[];
  questionReviews: Array<{
    question: Question;
    userSelectedOptionIds: string[];
    isCorrect: boolean;
    timeSpentSeconds: number;
    explanation: string;
    sourceReference?: string;
  }>;
}

/* =========================================================================
   1. In-Memory Mock LocalStorage
   ========================================================================= */
export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public get length(): number {
    return this.store.size;
  }

  public key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

/* =========================================================================
   2. Mock Web Audio API Synthesizer
   ========================================================================= */
export interface AudioEvent {
  type: "chime" | "buzzer" | "fanfare" | "tick";
  frequency?: number;
  durationMs?: number;
  timestamp: number;
}

export class MockWebAudioSynthesizer {
  public events: AudioEvent[] = [];
  public isContextRunning: boolean = true;

  public playChime(): void {
    this.events.push({ type: "chime", frequency: 880, durationMs: 150, timestamp: Date.now() });
  }

  public playBuzzer(): void {
    this.events.push({ type: "buzzer", frequency: 220, durationMs: 300, timestamp: Date.now() });
  }

  public playFanfare(): void {
    this.events.push({ type: "fanfare", frequency: 1046.5, durationMs: 600, timestamp: Date.now() });
  }

  public playTick(): void {
    this.events.push({ type: "tick", frequency: 1200, durationMs: 30, timestamp: Date.now() });
  }

  public clear(): void {
    this.events = [];
  }
}

/* =========================================================================
   3. Canonical Module Schema Validator & Line Error Mapper
   ========================================================================= */
export interface ValidationErrorDetail {
  path: string;
  message: string;
  line?: number;
}

export function validateModuleSchema(data: any): {
  valid: boolean;
  errors: string[];
  errorDetails?: ValidationErrorDetail[];
} {
  const errors: string[] = [];
  const errorDetails: ValidationErrorDetail[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Module root must be an object");
    errorDetails.push({ path: "root", message: "Module root must be an object" });
    return { valid: false, errors, errorDetails };
  }

  if (typeof data.title !== "string" || !data.title.trim()) {
    errors.push("Missing or empty 'title'");
    errorDetails.push({ path: "title", message: "Module title is required" });
  }
  if (typeof data.description !== "string") {
    errors.push("Missing 'description'");
    errorDetails.push({ path: "description", message: "Description must be a string" });
  }
  if (data.moduleType !== "quiz" && data.moduleType !== "exam") {
    errors.push("Invalid 'moduleType': must be 'quiz' or 'exam'");
    errorDetails.push({ path: "moduleType", message: "Invalid 'moduleType': must be 'quiz' or 'exam'" });
  }
  if (typeof data.targetSubject !== "string" || !data.targetSubject.trim()) {
    errors.push("Missing or empty 'targetSubject'");
    errorDetails.push({ path: "targetSubject", message: "Target subject is required" });
  }
  if (data.course !== undefined && typeof data.course !== "string") {
    errors.push("'course' must be a string if provided");
    errorDetails.push({ path: "course", message: "'course' must be a string" });
  }
  if (!data.config || typeof data.config !== "object") {
    errors.push("Missing 'config' object");
    errorDetails.push({ path: "config", message: "Missing 'config' object" });
  } else {
    if (data.moduleType === "quiz" && data.config.quizConfig) {
      const qc = data.config.quizConfig;
      if (typeof qc.checkpointInterval !== "number" || qc.checkpointInterval <= 0) {
        errors.push("quizConfig.checkpointInterval must be a positive integer");
        errorDetails.push({ path: "config.quizConfig.checkpointInterval", message: "Must be a positive integer" });
      }
      if (typeof qc.timePerQuestionSeconds !== "number" || qc.timePerQuestionSeconds <= 0) {
        errors.push("quizConfig.timePerQuestionSeconds must be positive");
        errorDetails.push({ path: "config.quizConfig.timePerQuestionSeconds", message: "Must be positive" });
      }
      if (typeof qc.checkpointPassThreshold !== "number" || qc.checkpointPassThreshold <= 0 || qc.checkpointPassThreshold > 1) {
        errors.push("quizConfig.checkpointPassThreshold must be between 0 and 1");
        errorDetails.push({ path: "config.quizConfig.checkpointPassThreshold", message: "Must be between 0 and 1" });
      }
    }
    if (data.moduleType === "exam" && data.config.examConfig) {
      const ec = data.config.examConfig;
      if (typeof ec.totalDurationMinutes !== "number" || ec.totalDurationMinutes <= 0) {
        errors.push("examConfig.totalDurationMinutes must be positive");
        errorDetails.push({ path: "config.examConfig.totalDurationMinutes", message: "Must be positive" });
      }
      if (typeof ec.passingScorePercentage !== "number" || ec.passingScorePercentage < 0 || ec.passingScorePercentage > 100) {
        errors.push("examConfig.passingScorePercentage must be between 0 and 100");
        errorDetails.push({ path: "config.examConfig.passingScorePercentage", message: "Must be between 0 and 100" });
      }
    }
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("'questions' must be a non-empty array");
    errorDetails.push({ path: "questions", message: "Module must contain at least one question" });
  } else {
    data.questions.forEach((q: any, idx: number) => {
      if (!q.id || typeof q.id !== "string") {
        errors.push(`Question[${idx}]: missing 'id'`);
        errorDetails.push({ path: `questions[${idx}].id`, message: "Question ID is required" });
      }
      if (!["multiple_choice", "multi_select", "true_false"].includes(q.type)) {
        errors.push(`Question[${idx}]: invalid type '${q.type}'`);
        errorDetails.push({ path: `questions[${idx}].type`, message: "Invalid question type" });
      }
      if (!["easy", "medium", "hard"].includes(q.difficulty)) {
        errors.push(`Question[${idx}]: invalid difficulty '${q.difficulty}'`);
        errorDetails.push({ path: `questions[${idx}].difficulty`, message: "Invalid difficulty" });
      }
      if (!q.prompt || typeof q.prompt !== "string" || !q.prompt.trim()) {
        errors.push(`Question[${idx}]: missing prompt`);
        errorDetails.push({ path: `questions[${idx}].prompt`, message: "Question prompt is required" });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question[${idx}]: must have at least 2 options`);
        errorDetails.push({ path: `questions[${idx}].options`, message: "Must have at least 2 options" });
      } else {
        const optIds = new Set<string>();
        q.options.forEach((opt: any, optIdx: number) => {
          if (!opt.id || typeof opt.id !== "string") {
            errors.push(`Question[${idx}].option[${optIdx}]: missing id`);
            errorDetails.push({ path: `questions[${idx}].options[${optIdx}].id`, message: "Option ID is required" });
          }
          if (!opt.text || typeof opt.text !== "string") {
            errors.push(`Question[${idx}].option[${optIdx}]: missing text`);
            errorDetails.push({ path: `questions[${idx}].options[${optIdx}].text`, message: "Option text is required" });
          }
          if (optIds.has(opt.id)) {
            errors.push(`Question[${idx}]: duplicate option id '${opt.id}'`);
            errorDetails.push({ path: `questions[${idx}].options[${optIdx}].id`, message: `Duplicate option ID '${opt.id}'` });
          }
          optIds.add(opt.id);
        });

        if (!Array.isArray(q.correctOptionIds) || q.correctOptionIds.length === 0) {
          errors.push(`Question[${idx}]: missing or empty 'correctOptionIds'`);
          errorDetails.push({ path: `questions[${idx}].correctOptionIds`, message: "At least one correct option required" });
        } else {
          for (const cId of q.correctOptionIds) {
            if (!optIds.has(cId)) {
              errors.push(`Question[${idx}]: correctOptionId '${cId}' does not match any option in the question`);
              errorDetails.push({ path: `questions[${idx}].correctOptionIds`, message: `Option '${cId}' not found in options` });
            }
          }
        }
      }
      if (typeof q.explanation !== "string") {
        errors.push(`Question[${idx}]: missing 'explanation'`);
        errorDetails.push({ path: `questions[${idx}].explanation`, message: "Explanation is required" });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    errorDetails,
  };
}

/* =========================================================================
   3b. JSON Auto-Formatter and Live Ingress Validation Helper
   ========================================================================= */
export function formatJson(raw: string, indent: number = 2): { formatted: string; success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      formatted: JSON.stringify(parsed, null, indent),
      success: true,
    };
  } catch (err: any) {
    return {
      formatted: raw,
      success: false,
      error: err?.message || "Invalid JSON syntax",
    };
  }
}

export function validateJsonModuleString(raw: string): {
  valid: boolean;
  module?: PrepPulseModule;
  errors: string[];
  lineErrors: Array<{ line: number; message: string }>;
  statusBadge: "Compatible" | "Invalid JSON" | "Schema Errors";
} {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    // Determine line error from JSON.parse error message if available
    let line = 1;
    const match = err.message.match(/line (\d+)/i) || err.message.match(/position (\d+)/i);
    if (match) {
      const pos = parseInt(match[1], 10);
      if (!isNaN(pos)) {
        line = raw.slice(0, pos).split("\n").length;
      }
    }
    return {
      valid: false,
      errors: [err.message || "Invalid JSON syntax"],
      lineErrors: [{ line, message: err.message || "Syntax Error" }],
      statusBadge: "Invalid JSON",
    };
  }

  const result = validateModuleSchema(parsed);
  const lineErrors: Array<{ line: number; message: string }> = [];
  const lines = raw.split("\n");

  if (!result.valid && result.errorDetails) {
    for (const detail of result.errorDetails) {
      // Find approximate line number by matching path key in raw text
      const keyName = detail.path.split(".").pop()?.replace(/\[\d+\]/, "") || "";
      let foundLine = 1;
      if (keyName) {
        const lineIdx = lines.findIndex((l) => l.includes(`"${keyName}"`));
        if (lineIdx !== -1) foundLine = lineIdx + 1;
      }
      lineErrors.push({ line: foundLine, message: detail.message });
    }
  }

  return {
    valid: result.valid,
    module: result.valid ? (parsed as PrepPulseModule) : undefined,
    errors: result.errors,
    lineErrors,
    statusBadge: result.valid ? "Compatible" : "Schema Errors",
  };
}

/* =========================================================================
   3c. Storage Management for Custom Modules and Session Eviction
   ========================================================================= */
export const GUEST_CUSTOM_MODULES_KEY = "preppulse_local_modules";
export const GUEST_SESSION_PREFIX = "preppulse_guest_session_";
export const GUEST_REPORT_PREFIX = "preppulse_diagnostic_";

export function getLocalCustomModules(storage: MockLocalStorage): PrepPulseModule[] {
  const raw = storage.getItem(GUEST_CUSTOM_MODULES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalCustomModule(storage: MockLocalStorage, module: PrepPulseModule): void {
  const existing = getLocalCustomModules(storage);
  const modId = module.moduleId || `mod_${Date.now()}`;
  const moduleToSave = { ...module, moduleId: modId };
  const updated = [moduleToSave, ...existing.filter((m) => m.moduleId !== modId)];
  storage.setItem(GUEST_CUSTOM_MODULES_KEY, JSON.stringify(updated));
}

export function clearSessionCacheForModule(storage: MockLocalStorage, moduleId: string): void {
  const allKeys = storage.getAllKeys();
  for (const key of allKeys) {
    if (key.startsWith(GUEST_SESSION_PREFIX) || key.startsWith(GUEST_REPORT_PREFIX)) {
      const val = storage.getItem(key);
      if (val && val.includes(`"${moduleId}"`)) {
        storage.removeItem(key);
      }
    }
  }
}

export function deleteLocalCustomModule(storage: MockLocalStorage, moduleId: string): boolean {
  const existing = getLocalCustomModules(storage);
  const filtered = existing.filter((m) => m.moduleId !== moduleId);
  if (filtered.length === existing.length) {
    return false;
  }
  storage.setItem(GUEST_CUSTOM_MODULES_KEY, JSON.stringify(filtered));
  clearSessionCacheForModule(storage, moduleId);
  return true;
}

export function deleteLocalCustomModules(storage: MockLocalStorage, moduleIds: string[]): number {
  const idSet = new Set(moduleIds);
  const existing = getLocalCustomModules(storage);
  const remaining = existing.filter((m) => !m.moduleId || !idSet.has(m.moduleId));
  const deletedCount = existing.length - remaining.length;
  if (deletedCount > 0) {
    storage.setItem(GUEST_CUSTOM_MODULES_KEY, JSON.stringify(remaining));
    for (const id of moduleIds) {
      clearSessionCacheForModule(storage, id);
    }
  }
  return deletedCount;
}

export function updateLocalCustomModuleCourse(storage: MockLocalStorage, moduleId: string, course: string): boolean {
  const existing = getLocalCustomModules(storage);
  let found = false;
  const updated = existing.map((m) => {
    if (m.moduleId === moduleId) {
      found = true;
      return { ...m, course: course.trim() };
    }
    return m;
  });
  if (found) {
    storage.setItem(GUEST_CUSTOM_MODULES_KEY, JSON.stringify(updated));
  }
  return found;
}

export function updateLocalCustomModulesCourse(storage: MockLocalStorage, moduleIds: string[], course: string): number {
  const idSet = new Set(moduleIds);
  const existing = getLocalCustomModules(storage);
  let count = 0;
  const updated = existing.map((m) => {
    if (m.moduleId && idSet.has(m.moduleId)) {
      count++;
      return { ...m, course: course.trim() };
    }
    return m;
  });
  if (count > 0) {
    storage.setItem(GUEST_CUSTOM_MODULES_KEY, JSON.stringify(updated));
  }
  return count;
}

/* =========================================================================
   3d. Course Categorization, Dynamic Filter Bar & Accordion Grouping Engine
   ========================================================================= */
export interface CourseTab {
  id: string; // course name or "ALL"
  label: string;
  count: number;
}

export function extractCourseTabs(modules: PrepPulseModule[]): CourseTab[] {
  const courseCounts: Record<string, number> = {};
  for (const m of modules) {
    const c = m.course && m.course.trim() ? m.course.trim() : "Unassigned";
    courseCounts[c] = (courseCounts[c] || 0) + 1;
  }

  const tabs: CourseTab[] = [
    { id: "ALL", label: "All Courses", count: modules.length },
  ];

  const sortedCourses = Object.keys(courseCounts).sort();
  for (const c of sortedCourses) {
    tabs.push({ id: c, label: c, count: courseCounts[c] });
  }

  return tabs;
}

export function filterModulesByCourse(modules: PrepPulseModule[], courseFilter: string): PrepPulseModule[] {
  if (!courseFilter || courseFilter === "ALL") {
    return [...modules];
  }
  if (courseFilter === "Unassigned") {
    return modules.filter((m) => !m.course || !m.course.trim());
  }
  return modules.filter((m) => m.course && m.course.trim().toLowerCase() === courseFilter.trim().toLowerCase());
}

export function groupModulesByCourse(modules: PrepPulseModule[]): Record<string, PrepPulseModule[]> {
  const grouped: Record<string, PrepPulseModule[]> = {};
  for (const m of modules) {
    const c = m.course && m.course.trim() ? m.course.trim() : "Unassigned";
    if (!grouped[c]) {
      grouped[c] = [];
    }
    grouped[c].push(m);
  }
  return grouped;
}

/* =========================================================================
   3e. Library Manage Mode State Machine
   ========================================================================= */
export class LibraryManageEngine {
  public isManageMode: boolean = false;
  public selectedIds: Set<string> = new Set();
  public collapsedAccordionCourses: Set<string> = new Set();
  public viewMode: "grid" | "accordion" = "grid";
  public activeCourseFilter: string = "ALL";

  public toggleManageMode(): boolean {
    this.isManageMode = !this.isManageMode;
    if (!this.isManageMode) {
      this.selectedIds.clear();
    }
    return this.isManageMode;
  }

  public setViewMode(mode: "grid" | "accordion"): void {
    this.viewMode = mode;
  }

  public setCourseFilter(filter: string): void {
    this.activeCourseFilter = filter;
  }

  public toggleAccordion(courseName: string): boolean {
    if (this.collapsedAccordionCourses.has(courseName)) {
      this.collapsedAccordionCourses.delete(courseName);
      return false; // now expanded
    } else {
      this.collapsedAccordionCourses.add(courseName);
      return true; // now collapsed
    }
  }

  public toggleSelect(moduleId: string, isProtected?: boolean): boolean {
    if (isProtected) {
      return false; // Protected demo modules cannot be selected
    }
    if (this.selectedIds.has(moduleId)) {
      this.selectedIds.delete(moduleId);
      return false;
    } else {
      this.selectedIds.add(moduleId);
      return true;
    }
  }

  public selectAll(modules: PrepPulseModule[]): void {
    this.selectedIds.clear();
    for (const m of modules) {
      if (m.moduleId && !m.isProtected) {
        this.selectedIds.add(m.moduleId);
      }
    }
  }

  public deselectAll(): void {
    this.selectedIds.clear();
  }

  public getSelectionCount(): number {
    return this.selectedIds.size;
  }

  public executeBatchDelete(storage: MockLocalStorage): number {
    const ids = Array.from(this.selectedIds);
    const count = deleteLocalCustomModules(storage, ids);
    this.selectedIds.clear();
    return count;
  }

  public executeBatchMove(storage: MockLocalStorage, targetCourse: string): number {
    const ids = Array.from(this.selectedIds);
    const count = updateLocalCustomModulesCourse(storage, ids, targetCourse);
    this.selectedIds.clear();
    return count;
  }
}

/* =========================================================================
   4. Fisher-Yates Shuffle Engine
   ========================================================================= */
export function fisherYatesShuffle<T>(array: readonly T[], randomSource: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/* =========================================================================
   5. Pure Rapid-Fire Quiz Checkpoint State Machine
   ========================================================================= */
export type QuizStatus = "ready" | "running" | "checkpoint_failed" | "checkpoint_passed" | "finished";

export class PureQuizCheckpointEngine {
  public allQuestions: Question[];
  public config: QuizConfig;
  public shuffledQuestions: Question[] = [];
  public currentIndex: number = 0;
  public currentCheckpoint: number = 1;
  public timeLeft: number;
  public status: QuizStatus = "ready";
  public isActive: boolean = false;
  public checkpointAnswers: Record<string, boolean> = {};
  public allUserAnswers: Record<string, string[]> = {};
  public streakCount: number = 0;
  public maxStreak: number = 0;

  constructor(allQuestions: Question[], config: QuizConfig) {
    this.allQuestions = allQuestions;
    this.config = config;
    this.timeLeft = config.timePerQuestionSeconds;
  }

  public initQuiz(randomSource?: () => number): void {
    this.shuffledQuestions = fisherYatesShuffle(this.allQuestions, randomSource);
    this.currentIndex = 0;
    this.currentCheckpoint = 1;
    this.timeLeft = this.config.timePerQuestionSeconds;
    this.checkpointAnswers = {};
    this.allUserAnswers = {};
    this.streakCount = 0;
    this.maxStreak = 0;
    this.status = "running";
    this.isActive = true;
  }

  public tickSecond(): void {
    if (!this.isActive || this.status !== "running") return;
    if (this.timeLeft <= 1) {
      this.timeLeft = 0;
      this.evaluateAnswer(null);
    } else {
      this.timeLeft -= 1;
    }
  }

  public evaluateAnswer(selectedOptionIds: string[] | string | null): {
    isCorrect: boolean;
    isCheckpointBoundary: boolean;
    checkpointScoreRatio?: number;
  } {
    if (!this.isActive || this.status !== "running") {
      throw new Error("Cannot answer question when quiz is not in running state");
    }

    const currentQ = this.shuffledQuestions[this.currentIndex];
    const userSelected = selectedOptionIds
      ? Array.isArray(selectedOptionIds)
        ? selectedOptionIds
        : [selectedOptionIds]
      : [];

    this.allUserAnswers[currentQ.id] = userSelected;

    const correctSet = new Set(currentQ.correctOptionIds);
    const isCorrect =
      userSelected.length > 0 &&
      userSelected.length === correctSet.size &&
      userSelected.every((id) => correctSet.has(id));

    if (isCorrect) {
      this.streakCount++;
      if (this.streakCount > this.maxStreak) this.maxStreak = this.streakCount;
    } else {
      this.streakCount = 0;
    }

    this.checkpointAnswers[currentQ.id] = isCorrect;

    const isCheckpointBoundary =
      (this.currentIndex + 1) % this.config.checkpointInterval === 0 ||
      this.currentIndex + 1 === this.shuffledQuestions.length;

    let checkpointScoreRatio: number | undefined;

    if (isCheckpointBoundary) {
      const recentResults = Object.values(this.checkpointAnswers);
      const correctCount = recentResults.filter(Boolean).length;
      checkpointScoreRatio = correctCount / recentResults.length;

      if (checkpointScoreRatio >= this.config.checkpointPassThreshold) {
        if (this.currentIndex + 1 >= this.shuffledQuestions.length) {
          this.status = "finished";
          this.isActive = false;
        } else {
          this.status = "checkpoint_passed";
          this.isActive = false;
        }
      } else {
        this.status = "checkpoint_failed";
        this.isActive = false;
      }
    } else {
      this.currentIndex += 1;
      this.timeLeft = this.config.timePerQuestionSeconds;
    }

    return { isCorrect, isCheckpointBoundary, checkpointScoreRatio };
  }

  public proceedToNextCheckpoint(): void {
    if (this.status !== "checkpoint_passed") {
      throw new Error("Cannot proceed: checkpoint not passed");
    }
    this.currentCheckpoint += 1;
    this.currentIndex += 1;
    this.checkpointAnswers = {};
    this.timeLeft = this.config.timePerQuestionSeconds;
    this.status = "running";
    this.isActive = true;
  }

  public retryCurrentCheckpoint(): void {
    if (this.status !== "checkpoint_failed") {
      throw new Error("Cannot retry checkpoint unless in checkpoint_failed status");
    }
    const startIndex = (this.currentCheckpoint - 1) * this.config.checkpointInterval;
    this.currentIndex = startIndex;
    this.checkpointAnswers = {};
    this.timeLeft = this.config.timePerQuestionSeconds;
    this.status = "running";
    this.isActive = true;
  }
}

/* =========================================================================
   6. Pure Comprehensive Exam Simulator Engine
   ========================================================================= */
export type QuestionGridState = "unanswered" | "answered" | "flagged" | "active";

export class PureExamSessionEngine {
  public module: PrepPulseModule;
  private storage?: MockLocalStorage;
  public questions: Question[];
  public currentQuestionIndex: number = 0;
  public answers: Record<string, string[]> = {};
  public flaggedQuestionIds: Set<string> = new Set();
  public timeRemainingSeconds: number;
  public totalDurationSeconds: number;
  public isSubmitted: boolean = false;
  public isTimeExpired: boolean = false;
  public timeSpentPerQuestion: Record<string, number> = {};

  constructor(module: PrepPulseModule, storage?: MockLocalStorage) {
    this.module = module;
    this.storage = storage;
    this.questions = module.questions;
    const durationMin = module.config.examConfig?.totalDurationMinutes || 60;
    this.totalDurationSeconds = durationMin * 60;
    this.timeRemainingSeconds = this.totalDurationSeconds;
  }

  public selectOption(questionId: string, optionId: string): void {
    if (this.isSubmitted) throw new Error("Exam already submitted");
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) throw new Error(`Question ${questionId} not found`);

    if (question.type === "multi_select") {
      const current = this.answers[questionId] || [];
      if (current.includes(optionId)) {
        this.answers[questionId] = current.filter((id) => id !== optionId);
      } else {
        this.answers[questionId] = [...current, optionId];
      }
    } else {
      this.answers[questionId] = [optionId];
    }

    this.persistState();
  }

  public toggleFlag(questionId?: string): boolean {
    if (this.isSubmitted) throw new Error("Exam already submitted");
    const targetId = questionId || this.questions[this.currentQuestionIndex]?.id;
    if (!targetId) return false;

    if (this.flaggedQuestionIds.has(targetId)) {
      this.flaggedQuestionIds.delete(targetId);
      this.persistState();
      return false;
    } else {
      this.flaggedQuestionIds.add(targetId);
      this.persistState();
      return true;
    }
  }

  public navigateTo(index: number): void {
    if (index < 0 || index >= this.questions.length) {
      throw new Error(`Invalid navigation index ${index}`);
    }
    this.currentQuestionIndex = index;
    this.persistState();
  }

  public recordTimeSpent(questionId: string, seconds: number): void {
    this.timeSpentPerQuestion[questionId] = (this.timeSpentPerQuestion[questionId] || 0) + seconds;
  }

  public getQuestionState(questionId: string): {
    state: QuestionGridState;
    isFlagged: boolean;
    isAnswered: boolean;
    isActive: boolean;
  } {
    const isAnswered = Boolean(this.answers[questionId] && this.answers[questionId].length > 0);
    const isFlagged = this.flaggedQuestionIds.has(questionId);
    const isActive = this.questions[this.currentQuestionIndex]?.id === questionId;

    let state: QuestionGridState = "unanswered";
    if (isActive) state = "active";
    else if (isAnswered) state = "answered";
    else if (isFlagged) state = "flagged";

    return { state, isFlagged, isAnswered, isActive };
  }

  public getReviewDrawerSummary(): {
    totalQuestions: number;
    answeredCount: number;
    unansweredCount: number;
    flaggedCount: number;
    unansweredIds: string[];
    flaggedIds: string[];
  } {
    const unansweredIds: string[] = [];
    const flaggedIds = Array.from(this.flaggedQuestionIds);

    for (const q of this.questions) {
      if (!this.answers[q.id] || this.answers[q.id].length === 0) {
        unansweredIds.push(q.id);
      }
    }

    const answeredCount = this.questions.length - unansweredIds.length;

    return {
      totalQuestions: this.questions.length,
      answeredCount,
      unansweredCount: unansweredIds.length,
      flaggedCount: flaggedIds.length,
      unansweredIds,
      flaggedIds,
    };
  }

  public tickSecond(): void {
    if (this.isSubmitted || this.isTimeExpired) return;
    if (this.timeRemainingSeconds <= 1) {
      this.timeRemainingSeconds = 0;
      this.isTimeExpired = true;
      this.submit();
    } else {
      this.timeRemainingSeconds -= 1;
      const currentQId = this.questions[this.currentQuestionIndex]?.id;
      if (currentQId) {
        this.recordTimeSpent(currentQId, 1);
      }
      this.persistState();
    }
  }

  public submit(): void {
    this.isSubmitted = true;
    this.persistState();
  }

  public persistState(): void {
    if (!this.storage) return;
    const state = {
      moduleId: this.module.moduleId,
      answers: this.answers,
      flaggedQuestionIds: Array.from(this.flaggedQuestionIds),
      currentQuestionIndex: this.currentQuestionIndex,
      timeRemainingSeconds: this.timeRemainingSeconds,
      timeSpentPerQuestion: this.timeSpentPerQuestion,
      isSubmitted: this.isSubmitted,
    };
    this.storage.setItem(`exam_session_${this.module.moduleId}`, JSON.stringify(state));
  }

  public restoreFromStorage(): boolean {
    if (!this.storage) return false;
    const raw = this.storage.getItem(`exam_session_${this.module.moduleId}`);
    if (!raw) return false;
    try {
      const state = JSON.parse(raw);
      this.answers = state.answers || {};
      this.flaggedQuestionIds = new Set(state.flaggedQuestionIds || []);
      this.currentQuestionIndex = state.currentQuestionIndex || 0;
      this.timeRemainingSeconds = state.timeRemainingSeconds ?? this.totalDurationSeconds;
      this.timeSpentPerQuestion = state.timeSpentPerQuestion || {};
      this.isSubmitted = Boolean(state.isSubmitted);
      return true;
    } catch {
      return false;
    }
  }
}

/* =========================================================================
   7. Pure Diagnostic Score Calculator & Remediation Engine
   ========================================================================= */
export class PureScoreCalculator {
  public static calculateReport(
    module: PrepPulseModule,
    userAnswers: Record<string, string[]>,
    questionTimeSpent: Record<string, number>,
    totalTimeSpentSeconds?: number
  ): DiagnosticReport {
    const questions = module.questions;
    const totalQuestions = questions.length;
    let correctCount = 0;
    const missedQuestionIds: string[] = [];
    const questionReviews: DiagnosticReport["questionReviews"] = [];

    const topicStats: Record<string, { total: number; correct: number }> = {};
    const difficultyStats: DiagnosticReport["difficultyAccuracy"] = {
      easy: { total: 0, correct: 0, percentage: 0 },
      medium: { total: 0, correct: 0, percentage: 0 },
      hard: { total: 0, correct: 0, percentage: 0 },
    };

    let calculatedTotalTime = 0;

    for (const q of questions) {
      const userSelected = userAnswers[q.id] || [];
      const correctSet = new Set(q.correctOptionIds);
      const isCorrect =
        userSelected.length > 0 &&
        userSelected.length === correctSet.size &&
        userSelected.every((id) => correctSet.has(id));

      if (isCorrect) correctCount++;
      else missedQuestionIds.push(q.id);

      const timeSpent = questionTimeSpent[q.id] || 0;
      calculatedTotalTime += timeSpent;

      const topic = q.topic || module.targetSubject || "General";
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
      topicStats[topic].total += 1;
      if (isCorrect) topicStats[topic].correct += 1;

      if (difficultyStats[q.difficulty]) {
        difficultyStats[q.difficulty].total += 1;
        if (isCorrect) difficultyStats[q.difficulty].correct += 1;
      }

      questionReviews.push({
        question: q,
        userSelectedOptionIds: userSelected,
        isCorrect,
        timeSpentSeconds: timeSpent,
        explanation: q.explanation,
        sourceReference: q.sourceReference,
      });
    }

    const finalTotalTime = totalTimeSpentSeconds !== undefined ? totalTimeSpentSeconds : calculatedTotalTime;
    const scorePercentage = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;
    const passingThreshold = module.config.examConfig?.passingScorePercentage ?? 60;
    const passed = scorePercentage >= passingThreshold;
    const averagePaceSeconds = totalQuestions > 0 ? Number((finalTotalTime / totalQuestions).toFixed(2)) : 0;

    for (const diff of ["easy", "medium", "hard"] as const) {
      const d = difficultyStats[diff];
      d.percentage = d.total > 0 ? Number(((d.correct / d.total) * 100).toFixed(2)) : 0;
    }

    const topicMastery: DiagnosticReport["topicMastery"] = Object.entries(topicStats).map(([topic, stats]) => {
      const percentage = stats.total > 0 ? Number(((stats.correct / stats.total) * 100).toFixed(2)) : 0;
      let status: "mastered" | "competent" | "weak_spot" = "weak_spot";
      if (percentage >= 80) status = "mastered";
      else if (percentage >= 60) status = "competent";

      return {
        topic,
        total: stats.total,
        correct: stats.correct,
        percentage,
        status,
      };
    });

    const timeTraps: string[] = [];
    const rushedErrors: string[] = [];

    if (averagePaceSeconds > 0) {
      for (const review of questionReviews) {
        if (!review.isCorrect) {
          if (review.timeSpentSeconds > 2 * averagePaceSeconds) {
            timeTraps.push(review.question.id);
          } else if (review.timeSpentSeconds < 0.5 * averagePaceSeconds) {
            rushedErrors.push(review.question.id);
          }
        }
      }
    }

    return {
      totalQuestions,
      correctCount,
      scorePercentage,
      passed,
      totalTimeSpentSeconds: finalTotalTime,
      averagePaceSeconds,
      topicMastery,
      difficultyAccuracy: difficultyStats,
      timeTraps,
      rushedErrors,
      missedQuestionIds,
      questionReviews,
    };
  }

  public static generateSmartRetryModule(originalModule: PrepPulseModule, missedQuestionIds: string[]): PrepPulseModule {
    const missedSet = new Set(missedQuestionIds);
    const filteredQuestions = originalModule.questions.filter((q) => missedSet.has(q.id));

    const reindexedQuestions = filteredQuestions.map((q, idx) => ({
      ...q,
      checkpoint: Math.floor(idx / 5) + 1,
    }));

    return {
      moduleId: `retry_${originalModule.moduleId || "mod"}_${Date.now()}`,
      title: `Smart Retry: ${originalModule.title} (Weak Spots)`,
      description: `Targeted remediation quiz focusing on ${filteredQuestions.length} previously missed questions.`,
      moduleType: "quiz",
      targetSubject: originalModule.targetSubject,
      course: originalModule.course,
      config: {
        quizConfig: {
          checkpointInterval: Math.min(5, Math.max(1, filteredQuestions.length)),
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
          enableStreakBonus: true,
        },
      },
      questions: reindexedQuestions,
    };
  }
}

/* =========================================================================
   8. In-Memory Mock Supabase DB & Row Level Security (RLS) Engine
   ========================================================================= */
export interface DBProfile {
  id: string;
  email: string;
  full_name: string;
}

export interface DBModule {
  id: string;
  user_id: string;
  title: string;
  description: string;
  module_type: "quiz" | "exam";
  subject: string;
  course?: string;
  config: any;
  raw_json: any;
  is_public?: boolean;
}

export interface DBQuestion {
  id: string;
  module_id: string;
  checkpoint_tier: number;
  question_type: string;
  difficulty: string;
  prompt: string;
  options: any;
  correct_option_ids: any;
  explanation: string;
}

export interface DBTestSession {
  id: string;
  user_id: string;
  module_id: string;
  session_type: "quiz" | "exam";
  status: "in_progress" | "passed" | "failed" | "completed";
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_spent_seconds: number;
  checkpoint_reached: number;
  breakdown: any;
}

export class MockSupabaseEngine {
  public profiles: Map<string, DBProfile> = new Map();
  public modules: Map<string, DBModule> = new Map();
  public questions: Map<string, DBQuestion> = new Map();
  public testSessions: Map<string, DBTestSession> = new Map();

  public createProfile(profile: DBProfile): DBProfile {
    this.profiles.set(profile.id, { ...profile });
    return profile;
  }

  public insertModule(actorUserId: string | null, mod: DBModule): DBModule {
    if (!actorUserId) {
      throw new Error("RLS Error: Unauthenticated user cannot create private modules");
    }
    if (mod.user_id !== actorUserId) {
      throw new Error("RLS Error: Cannot create module on behalf of another user");
    }
    this.modules.set(mod.id, { ...mod });
    return mod;
  }

  public queryModules(actorUserId: string | null): DBModule[] {
    const results: DBModule[] = [];
    for (const mod of this.modules.values()) {
      if (mod.is_public || (actorUserId && mod.user_id === actorUserId)) {
        results.push({ ...mod });
      }
    }
    return results;
  }

  public queryQuestions(actorUserId: string | null, moduleId: string): DBQuestion[] {
    const parentModule = this.modules.get(moduleId);
    if (!parentModule) return [];

    if (!parentModule.is_public && (!actorUserId || parentModule.user_id !== actorUserId)) {
      return [];
    }

    const results: DBQuestion[] = [];
    for (const q of this.questions.values()) {
      if (q.module_id === moduleId) {
        results.push({ ...q });
      }
    }
    return results;
  }

  public insertTestSession(actorUserId: string | null, session: DBTestSession): DBTestSession {
    if (!actorUserId && !session.user_id.startsWith("guest_")) {
      throw new Error("RLS Error: Cannot record authenticated session without active user token");
    }
    if (actorUserId && session.user_id !== actorUserId) {
      throw new Error("RLS Error: Tenant isolation violation - cannot write session for other user");
    }
    this.testSessions.set(session.id, { ...session });
    return session;
  }

  public queryTestSessions(actorUserId: string | null): DBTestSession[] {
    if (!actorUserId) return [];
    const results: DBTestSession[] = [];
    for (const s of this.testSessions.values()) {
      if (s.user_id === actorUserId) {
        results.push({ ...s });
      }
    }
    return results;
  }

  public deleteModule(actorUserId: string | null, moduleId: string): boolean {
    const mod = this.modules.get(moduleId);
    if (!mod) return false;
    if (!actorUserId || mod.user_id !== actorUserId) {
      throw new Error("RLS Error: Cannot delete module owned by another user or guest");
    }

    for (const [qId, q] of this.questions.entries()) {
      if (q.module_id === moduleId) this.questions.delete(qId);
    }
    for (const [sId, s] of this.testSessions.entries()) {
      if (s.module_id === moduleId) this.testSessions.delete(sId);
    }

    return this.modules.delete(moduleId);
  }

  /* =========================================================================
     9. Supabase Service Role Admin Client Operations (RLS Bypass)
     ========================================================================= */
  public simulateDatabaseFailure: boolean = false;

  public insertModuleWithServiceRole(mod: DBModule): DBModule {
    if (this.simulateDatabaseFailure) {
      throw new Error("Supabase PostgreSQL write failed: connection error or table constraint violation");
    }
    this.modules.set(mod.id, { ...mod });
    return mod;
  }

  public insertQuestionsWithServiceRole(questions: DBQuestion[]): void {
    if (this.simulateDatabaseFailure) {
      throw new Error("Supabase PostgreSQL write failed: questions insert batch failure");
    }
    for (const q of questions) {
      this.questions.set(q.id, { ...q });
    }
  }

  public queryModulesWithServiceRole(filters?: { type?: string | null; course?: string | null }): DBModule[] {
    if (this.simulateDatabaseFailure) {
      throw new Error("Supabase PostgreSQL query failed");
    }
    let results = Array.from(this.modules.values());
    if (filters?.type && (filters.type === "quiz" || filters.type === "exam")) {
      results = results.filter((m) => m.module_type === filters.type);
    }
    if (filters?.course && filters.course !== "ALL") {
      results = results.filter(
        (m) => (m.course || m.subject || "").toLowerCase() === filters.course!.toLowerCase()
      );
    }
    return results;
  }

  public getModuleWithServiceRole(moduleId: string): { module: DBModule; questions: DBQuestion[] } | null {
    if (this.simulateDatabaseFailure) {
      throw new Error("Supabase PostgreSQL query failed");
    }
    const mod = this.modules.get(moduleId);
    if (!mod) return null;
    const questions: DBQuestion[] = [];
    for (const q of this.questions.values()) {
      if (q.module_id === moduleId) questions.push({ ...q });
    }
    return { module: { ...mod }, questions };
  }

  public deleteModuleWithServiceRole(moduleId: string): boolean {
    if (this.simulateDatabaseFailure) {
      throw new Error("Supabase PostgreSQL deletion failed");
    }
    if (!this.modules.has(moduleId)) return false;

    for (const [qId, q] of this.questions.entries()) {
      if (q.module_id === moduleId) this.questions.delete(qId);
    }
    for (const [sId, s] of this.testSessions.entries()) {
      if (s.module_id === moduleId) this.testSessions.delete(sId);
    }
    return this.modules.delete(moduleId);
  }
}

/* =========================================================================
   10. Opaque-Box Server API Route Handlers (Service Role Admin Client)
   ========================================================================= */
export class MockApiModulesRouteHandler {
  private db: MockSupabaseEngine;

  constructor(db: MockSupabaseEngine) {
    this.db = db;
  }

  public handleGet(queryParams: { type?: string | null; course?: string | null } = {}): {
    status: number;
    body: { success?: boolean; count?: number; modules?: PrepPulseModule[]; error?: string; details?: any };
  } {
    try {
      const dbMods = this.db.queryModulesWithServiceRole(queryParams);
      const modules: PrepPulseModule[] = dbMods.map((row) => {
        const raw = (row.raw_json || {}) as PrepPulseModule;
        return {
          ...raw,
          moduleId: row.id,
          title: row.title || raw.title,
          description: row.description || raw.description || "",
          moduleType: row.module_type || raw.moduleType,
          targetSubject: row.subject || raw.targetSubject,
          course: row.course || raw.course || row.subject || "General Studies",
          questions: raw.questions || [],
        };
      });

      return {
        status: 200,
        body: {
          success: true,
          count: modules.length,
          modules,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: { error: "Failed to retrieve public modules", details: err.message },
      };
    }
  }

  public handlePost(payload: unknown): {
    status: number;
    body: { success?: boolean; count?: number; modules?: PrepPulseModule[]; error?: string; details?: any };
  } {
    if (!payload || typeof payload !== "object") {
      return { status: 400, body: { error: "Invalid module schema payload" } };
    }

    let inputModules: any[] = [];
    const payloadObj = payload as Record<string, any>;
    if (Array.isArray(payload)) {
      inputModules = payload;
    } else if (payloadObj.modules && Array.isArray(payloadObj.modules)) {
      inputModules = payloadObj.modules;
    } else if (payloadObj.title && payloadObj.questions) {
      inputModules = [payload];
    } else {
      return { status: 400, body: { error: "Invalid module schema payload" } };
    }

    if (inputModules.length === 0) {
      return { status: 400, body: { error: "No modules provided in payload" } };
    }

    const validatedModules: PrepPulseModule[] = [];
    for (const item of inputModules) {
      const val = validateModuleSchema(item);
      if (!val.valid) {
        return {
          status: 400,
          body: { error: "Invalid module schema payload", details: val.errors },
        };
      }
      validatedModules.push(item as PrepPulseModule);
    }

    const saved: PrepPulseModule[] = [];
    for (const mod of validatedModules) {
      const generatedId =
        mod.moduleId && mod.moduleId.length > 5
          ? mod.moduleId
          : `mod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const finalMod: PrepPulseModule = {
        ...mod,
        moduleId: generatedId,
        course: mod.course?.trim() || mod.targetSubject?.trim() || "General Studies",
        createdAt: mod.createdAt || new Date().toISOString(),
      };

      try {
        // Direct mutation against Supabase PostgreSQL via Service Role
        this.db.insertModuleWithServiceRole({
          id: generatedId,
          user_id: "system_admin",
          title: finalMod.title,
          description: finalMod.description,
          module_type: finalMod.moduleType,
          subject: finalMod.targetSubject,
          course: finalMod.course,
          config: finalMod.config,
          raw_json: finalMod,
          is_public: true,
        });

        const questionsPayload: DBQuestion[] = finalMod.questions.map((q) => ({
          id: q.id,
          module_id: generatedId,
          checkpoint_tier: q.checkpoint || 1,
          question_type: q.type,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options,
          correct_option_ids: q.correctOptionIds,
          explanation: q.explanation,
        }));

        this.db.insertQuestionsWithServiceRole(questionsPayload);
        saved.push(finalMod);
      } catch (dbErr: any) {
        // Explicit HTTP 500 error returned on write failure with zero in-memory fallback
        return {
          status: 500,
          body: {
            error: "Failed to persist uploaded modules to database",
            details: dbErr.message,
          },
        };
      }
    }

    return {
      status: 201,
      body: {
        success: true,
        count: saved.length,
        modules: saved,
      },
    };
  }

  public handleDelete(moduleId: string | null | undefined): {
    status: number;
    body: { success?: boolean; moduleId?: string; deleted?: boolean; error?: string; details?: any };
  } {
    if (!moduleId) {
      return { status: 400, body: { error: "Module ID is required" } };
    }

    try {
      const deleted = this.db.deleteModuleWithServiceRole(moduleId);
      return {
        status: 200,
        body: {
          success: true,
          moduleId,
          deleted,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: { error: "Failed to delete module from database", details: err.message },
      };
    }
  }
}

export class MockApiSingleModuleRouteHandler {
  private db: MockSupabaseEngine;

  constructor(db: MockSupabaseEngine) {
    this.db = db;
  }

  public handleGet(moduleId: string | null | undefined): {
    status: number;
    body: { success?: boolean; module?: PrepPulseModule; error?: string; details?: any };
  } {
    if (!moduleId) {
      return { status: 400, body: { error: "Module ID parameter is required" } };
    }

    try {
      const result = this.db.getModuleWithServiceRole(moduleId);
      if (!result) {
        // Zero demo module substitution - return 404
        return {
          status: 404,
          body: { error: `Module '${moduleId}' not found` },
        };
      }

      const raw = (result.module.raw_json || {}) as PrepPulseModule;
      const finalModule: PrepPulseModule = {
        ...raw,
        moduleId: result.module.id,
        title: result.module.title || raw.title,
        description: result.module.description || raw.description || "",
        moduleType: result.module.module_type || raw.moduleType,
        targetSubject: result.module.subject || raw.targetSubject,
        course: result.module.course || raw.course || result.module.subject || "General Studies",
        questions: raw.questions || [],
      };

      return {
        status: 200,
        body: {
          success: true,
          module: finalModule,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: { error: "Failed to fetch module from database", details: err.message },
      };
    }
  }
}

/* =========================================================================
   11. Learner Catalog & Player UI Simulation Helpers (R2 Empty & 404 States)
   ========================================================================= */
export interface CatalogRenderOutput {
  isEmpty: boolean;
  emptyStateText?: string;
  adminUploadLink?: string;
  renderedModuleCount: number;
  courseTabs: CourseTab[];
}

export function renderLearnerCatalog(modules: PrepPulseModule[]): CatalogRenderOutput {
  if (modules.length === 0) {
    return {
      isEmpty: true,
      emptyStateText: "No modules uploaded yet",
      adminUploadLink: "/admin",
      renderedModuleCount: 0,
      courseTabs: [{ id: "ALL", label: "All Courses", count: 0 }],
    };
  }

  const tabs = extractCourseTabs(modules);
  return {
    isEmpty: false,
    renderedModuleCount: modules.length,
    courseTabs: tabs,
  };
}

export interface PlayerRenderOutput {
  status: "READY" | "NOT_FOUND" | "ERROR";
  errorScreenTitle?: string;
  errorScreenMessage?: string;
  canPlay: boolean;
  module?: PrepPulseModule;
}

export function renderPlayerScreen(apiResponse: { status: number; body: any }): PlayerRenderOutput {
  if (apiResponse.status === 404) {
    return {
      status: "NOT_FOUND",
      errorScreenTitle: "Module Not Found",
      errorScreenMessage: apiResponse.body?.error || "The requested module does not exist.",
      canPlay: false,
    };
  }

  if (apiResponse.status !== 200 || !apiResponse.body?.module) {
    return {
      status: "ERROR",
      errorScreenTitle: "Error Loading Module",
      errorScreenMessage: apiResponse.body?.error || "Failed to load module.",
      canPlay: false,
    };
  }

  return {
    status: "READY",
    canPlay: true,
    module: apiResponse.body.module,
  };
}

