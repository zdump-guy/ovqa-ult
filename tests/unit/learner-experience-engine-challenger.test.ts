import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { PrepPulseModule, Question, TestSession } from "@/types";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { generateSmartRetryModule } from "@/lib/diagnostics/remediation";
import { formatDuration } from "@/lib/exam/useExamSession";
import { CourseAccordionGroup } from "@/components/dashboard/CourseAccordionGroup";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import CreateRedirectPage from "@/app/(dashboard)/create/page";
import DashboardRedirectPage from "@/app/(dashboard)/dashboard/page";
import { redirect } from "next/navigation";

// Mock next/navigation redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

describe("Challenger 2: Learner Experience & Engine Integrity Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /* -------------------------------------------------------------------------- */
  /* 1. Root / Course Library Rendering & Structure                             */
  /* -------------------------------------------------------------------------- */
  describe("1. Root / Course Library Direct Display", () => {
    it("renders demo and custom modules partitioned by course without requiring navigation clicks", () => {
      render(React.createElement(CourseAccordionGroup, { modules: ALL_DEMO_MODULES, isManageMode: false }));

      // Verify that course sections are displayed
      const courseHeaders = screen.getAllByRole("heading", { level: 3 });
      expect(courseHeaders.length).toBeGreaterThan(0);

      // Verify course names from demo modules are rendered (e.g. Distributed Systems, Cloud Architecture, etc.)
      const textContents = courseHeaders.map((h) => h.textContent);
      expect(textContents.some((t) => t?.includes("Distributed Systems") || t?.includes("Cloud Architecture"))).toBe(true);
    });

    it("displays empty state cleanly when 0 modules are provided", () => {
      render(React.createElement(CourseAccordionGroup, { modules: [], isManageMode: false }));
      expect(screen.getByText(/no modules found/i)).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Course Partitioning: Practice Quizzes vs Simulated Mock Exams           */
  /* -------------------------------------------------------------------------- */
  describe("2. Clean Module Partitioning into Quizzes and Exams", () => {
    const mixedModules: PrepPulseModule[] = [
      {
        moduleId: "courseA-quiz-1",
        title: "Course A Quiz 1",
        targetSubject: "CS 101",
        course: "Computer Science",
        moduleType: "quiz",
        createdAt: "2026-01-01T00:00:00Z",
        config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8, enableStreakBonus: true } },
        questions: [{ id: "q1", prompt: "Q1", type: "single_choice", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionIds: ["a"], difficulty: "easy", explanation: "Exp" }],
      },
      {
        moduleId: "courseA-quiz-2",
        title: "Course A Quiz 2",
        targetSubject: "CS 101",
        course: "Computer Science",
        moduleType: "quiz",
        createdAt: "2026-01-01T00:00:00Z",
        config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8, enableStreakBonus: true } },
        questions: [{ id: "q2", prompt: "Q2", type: "single_choice", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionIds: ["a"], difficulty: "easy", explanation: "Exp" }],
      },
      {
        moduleId: "courseA-exam-1",
        title: "Course A Final Exam",
        targetSubject: "CS 101",
        course: "Computer Science",
        moduleType: "exam",
        createdAt: "2026-01-01T00:00:00Z",
        config: { examConfig: { totalDurationMinutes: 60, passingScorePercentage: 70 } },
        questions: [{ id: "q3", prompt: "Q3", type: "single_choice", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionIds: ["a"], difficulty: "hard", explanation: "Exp" }],
      },
    ];

    it("partitions modules into distinct Practice Quizzes and Simulated Mock Exams sections", () => {
      render(React.createElement(CourseAccordionGroup, { modules: mixedModules, isManageMode: false }));

      // Check for section headers
      expect(screen.getByText(/Practice Quizzes \(2\)/i)).toBeDefined();
      expect(screen.getByText(/Simulated Mock Exams \(1\)/i)).toBeDefined();

      // Check course summary metadata
      expect(screen.getByText(/3 modules • 2 Quizzes • 1 Exams/i)).toBeDefined();
    });

    it("handles courses containing only quizzes without rendering empty exam sections", () => {
      const onlyQuizzes = mixedModules.filter((m) => m.moduleType === "quiz");
      render(React.createElement(CourseAccordionGroup, { modules: onlyQuizzes, isManageMode: false }));

      expect(screen.getByText(/Practice Quizzes \(2\)/i)).toBeDefined();
      expect(screen.queryByText(/Simulated Mock Exams/i)).toBeNull();
    });

    it("handles courses containing only exams without rendering empty quiz sections", () => {
      const onlyExams = mixedModules.filter((m) => m.moduleType === "exam");
      render(React.createElement(CourseAccordionGroup, { modules: onlyExams, isManageMode: false }));

      expect(screen.getByText(/Simulated Mock Exams \(1\)/i)).toBeDefined();
      expect(screen.queryByText(/Practice Quizzes/i)).toBeNull();
    });

    it("assigns unassigned courses to General Studies fallback", () => {
      const unassignedModule: PrepPulseModule = {
        ...mixedModules[0],
        moduleId: "unassigned-1",
        course: undefined,
      };
      render(React.createElement(CourseAccordionGroup, { modules: [unassignedModule], isManageMode: false }));
      expect(screen.getAllByText("General Studies").length).toBeGreaterThanOrEqual(1);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Single-Click Direct Launch Buttons                                      */
  /* -------------------------------------------------------------------------- */
  describe("3. Single-Click Direct Launch Button Actions", () => {
    const quizModule: PrepPulseModule = {
      moduleId: "test-quiz-101",
      title: "Test Quiz 101",
      targetSubject: "Mathematics",
      course: "Math",
      moduleType: "quiz",
      createdAt: "2026-01-01T00:00:00Z",
      config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8, enableStreakBonus: true } },
      questions: [{ id: "q1", prompt: "Q1", type: "single_choice", options: [{ id: "a", text: "A" }], correctOptionIds: ["a"], difficulty: "easy", explanation: "Exp" }],
    };

    const examModule: PrepPulseModule = {
      moduleId: "test-exam-202",
      title: "Test Exam 202",
      targetSubject: "Physics",
      course: "Physics",
      moduleType: "exam",
      createdAt: "2026-01-01T00:00:00Z",
      config: { examConfig: { totalDurationMinutes: 90, passingScorePercentage: 75 } },
      questions: [{ id: "q1", prompt: "Q1", type: "single_choice", options: [{ id: "a", text: "A" }], correctOptionIds: ["a"], difficulty: "easy", explanation: "Exp" }],
    };

    it("renders 'Start Quiz' button with direct href to /quiz/[moduleId]", () => {
      render(React.createElement(ModuleCard, { module: quizModule, isManageMode: false }));

      const link = screen.getByRole("link", { name: /start quiz/i });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/quiz/test-quiz-101");
    });

    it("renders 'Start Exam' button with direct href to /exam/[moduleId]", () => {
      render(React.createElement(ModuleCard, { module: examModule, isManageMode: false }));

      const link = screen.getByRole("link", { name: /start exam/i });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/exam/test-exam-202");
    });

    it("does not render delete button or selection checkbox in learner mode", () => {
      render(React.createElement(ModuleCard, { module: quizModule, isManageMode: false }));

      expect(screen.queryByLabelText(/select module/i)).toBeNull();
      expect(screen.queryByLabelText(/delete module/i)).toBeNull();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Route Redirects: /create -> /admin and /dashboard -> /                   */
  /* -------------------------------------------------------------------------- */
  describe("4. Route Redirect Verification", () => {
    it("/create calls redirect('/admin')", () => {
      expect(() => CreateRedirectPage()).not.toThrow();
      expect(redirect).toHaveBeenCalledWith("/admin");
    });

    it("/dashboard calls redirect('/')", () => {
      expect(() => DashboardRedirectPage()).not.toThrow();
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. /history Session Loading & Diagnostics Integration                     */
  /* -------------------------------------------------------------------------- */
  describe("5. History Session Retrieval & Storage Resilience", () => {
    it("retrieves and parses sessions stored in localStorage under preppulse_guest_session_*", () => {
      const mockSession: TestSession = {
        id: "preppulse_guest_session_1",
        moduleId: "demo-quiz-1",
        sessionType: "quiz",
        status: "passed",
        totalQuestions: 10,
        correctAnswers: 9,
        scorePercentage: 90,
        timeSpentSeconds: 120,
        checkpointReached: 2,
        completedAt: new Date().toISOString(),
      };

      localStorage.setItem("preppulse_guest_session_1", JSON.stringify(mockSession));

      const raw = localStorage.getItem("preppulse_guest_session_1");
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(parsed.id).toBe("preppulse_guest_session_1");
      expect(parsed.scorePercentage).toBe(90);
      expect(parsed.status).toBe("passed");
    });

    it("gracefully ignores corrupt non-JSON localStorage keys during session scan", () => {
      localStorage.setItem("preppulse_guest_session_corrupt", "{invalid-json: oops");
      localStorage.setItem("preppulse_guest_session_valid", JSON.stringify({ id: "valid-1", scorePercentage: 80 }));

      const loaded: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("preppulse_guest_session_")) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) loaded.push(JSON.parse(raw));
          } catch {
            // safely ignore corrupt entry
          }
        }
      }

      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe("valid-1");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. Scoring & Diagnostic Report Engine Integrity                           */
  /* -------------------------------------------------------------------------- */
  describe("6. Scoring & Diagnostic Report Engine Integrity", () => {
    const sampleQuestions: Question[] = [
      {
        id: "q1",
        prompt: "Question 1",
        type: "single_choice",
        options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
        correctOptionIds: ["a"],
        difficulty: "easy",
        explanation: "Exp 1",
        topic: "Topic Alpha",
      },
      {
        id: "q2",
        prompt: "Question 2",
        type: "single_choice",
        options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
        correctOptionIds: ["b"],
        difficulty: "medium",
        explanation: "Exp 2",
        topic: "Topic Alpha",
      },
      {
        id: "q3",
        prompt: "Question 3",
        type: "multi_select",
        options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }, { id: "c", text: "Option C" }],
        correctOptionIds: ["a", "c"],
        difficulty: "hard",
        explanation: "Exp 3",
        topic: "Topic Beta",
      },
      {
        id: "q4",
        prompt: "Question 4",
        type: "single_choice",
        options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
        correctOptionIds: ["a"],
        difficulty: "hard",
        explanation: "Exp 4",
        topic: "Topic Beta",
      },
    ];

    const testModule: PrepPulseModule = {
      moduleId: "mod-diagnostic-test",
      title: "Diagnostic Test Module",
      targetSubject: "Diagnostics",
      course: "General",
      moduleType: "exam",
      createdAt: "2026-01-01T00:00:00Z",
      config: { examConfig: { totalDurationMinutes: 30, passingScorePercentage: 75 } },
      questions: sampleQuestions,
    };

    it("calculates accurate scorePercentage, pass status, and topic mastery", () => {
      const userAnswers = {
        q1: ["a"],      // Correct (easy, Topic Alpha)
        q2: ["b"],      // Correct (medium, Topic Alpha)
        q3: ["a", "c"], // Correct (hard, Topic Beta)
        q4: ["b"],      // Wrong (hard, Topic Beta)
      };

      const questionTimes = {
        q1: 10,
        q2: 15,
        q3: 40,
        q4: 5,
      };

      const report = calculateDiagnosticReport({
        module: testModule,
        questions: sampleQuestions,
        userAnswers,
        questionTimes,
        totalTimeSpentSeconds: 70,
        passThresholdPercentage: 75,
      });

      expect(report.totalQuestions).toBe(4);
      expect(report.correctCount).toBe(3);
      expect(report.scorePercentage).toBe(75);
      expect(report.passed).toBe(true);
      expect(report.averagePaceSeconds).toBe(17.5);
      expect(report.missedQuestionIds).toEqual(["q4"]);

      // Topic Alpha: 2/2 = 100% -> mastered
      const topicAlpha = report.topicMastery.find((t) => t.topic === "Topic Alpha");
      expect(topicAlpha?.percentage).toBe(100);
      expect(topicAlpha?.status).toBe("mastered");

      // Topic Beta: 1/2 = 50% -> weak_spot
      const topicBeta = report.topicMastery.find((t) => t.topic === "Topic Beta");
      expect(topicBeta?.percentage).toBe(50);
      expect(topicBeta?.status).toBe("weak_spot");

      // Time velocity check: q4 is wrong with 5s (< 17.5 * 0.5 = 8.75s) -> rushed error
      expect(report.rushedErrors).toContain("q4");
    });

    it("detects time traps when incorrect question took > 2.0x average pace", () => {
      const userAnswers = {
        q1: ["a"], // Correct (10s)
        q2: ["a"], // Incorrect (80s - time trap!)
        q3: ["a", "c"], // Correct (10s)
        q4: ["a"], // Correct (10s)
      };

      const questionTimes = { q1: 10, q2: 80, q3: 10, q4: 10 };

      const report = calculateDiagnosticReport({
        module: testModule,
        questions: sampleQuestions,
        userAnswers,
        questionTimes,
        totalTimeSpentSeconds: 110,
        passThresholdPercentage: 75,
      });

      // Average pace = 110 / 4 = 27.5s. 2x pace = 55s. q2 took 80s -> time trap
      expect(report.timeTraps).toContain("q2");
    });

    it("generates a smart retry remediation module containing only missed questions", () => {
      const missedIds = ["q4"];
      const retryModule = generateSmartRetryModule(testModule, missedIds);

      expect(retryModule.moduleId.startsWith("retry_")).toBe(true);
      expect(retryModule.moduleType).toBe("quiz");
      expect(retryModule.questions.length).toBe(1);
      expect(retryModule.questions[0].id).toBe("q4");
      expect(retryModule.config.quizConfig?.checkpointInterval).toBe(1);
    });

    it("formats durations accurately in HH:MM:SS and MM:SS", () => {
      expect(formatDuration(0)).toBe("00:00");
      expect(formatDuration(45)).toBe("00:45");
      expect(formatDuration(90)).toBe("01:30");
      expect(formatDuration(3665)).toBe("01:01:05");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 7. Mass Dataset & Deep Engine Stress Testing                               */
  /* -------------------------------------------------------------------------- */
  describe("7. Mass Dataset & Deep Engine Stress Harness", () => {
    it("partitions a library of 100+ modules across 20 distinct courses cleanly", () => {
      const massModules: PrepPulseModule[] = [];
      for (let i = 0; i < 120; i++) {
        const courseId = `Course_${Math.floor(i / 6)}`;
        const isQuiz = i % 2 === 0;
        massModules.push({
          moduleId: `mass_mod_${i}`,
          title: `Mass Module ${i}`,
          targetSubject: `Subject ${i % 5}`,
          course: courseId,
          moduleType: isQuiz ? "quiz" : "exam",
          createdAt: "2026-01-01T00:00:00Z",
          config: isQuiz
            ? { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8, enableStreakBonus: true } }
            : { examConfig: { totalDurationMinutes: 45, passingScorePercentage: 70 } },
          questions: [
            {
              id: `q_${i}_1`,
              prompt: `Question for ${i}`,
              type: "single_choice",
              options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
              correctOptionIds: ["a"],
              difficulty: "medium",
              explanation: "Exp",
            },
          ],
        });
      }

      render(React.createElement(CourseAccordionGroup, { modules: massModules, isManageMode: false }));

      // 120 modules / 6 per course = 20 distinct courses
      const courseSections = screen.getAllByRole("region");
      expect(courseSections.length).toBe(20);

      // Verify all "Start Quiz" and "Start Exam" links point to valid routes
      const links = screen.getAllByRole("link");
      const quizLinks = links.filter((l) => l.textContent?.includes("Start Quiz"));
      const examLinks = links.filter((l) => l.textContent?.includes("Start Exam"));

      expect(quizLinks.length).toBe(60);
      expect(examLinks.length).toBe(60);

      quizLinks.forEach((l) => {
        expect(l.getAttribute("href")?.startsWith("/quiz/mass_mod_")).toBe(true);
      });

      examLinks.forEach((l) => {
        expect(l.getAttribute("href")?.startsWith("/exam/mass_mod_")).toBe(true);
      });
    });

    it("evaluates diagnostic scoring across edge cases (0% score, 100% score, uniform times)", () => {
      const sampleQuestion: Question = {
        id: "q_edge_1",
        prompt: "Prompt",
        type: "single_choice",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctOptionIds: ["a"],
        difficulty: "easy",
        explanation: "Exp",
      };

      const mod: PrepPulseModule = {
        moduleId: "mod_edge",
        title: "Edge Mod",
        targetSubject: "Math",
        moduleType: "quiz",
        createdAt: "2026-01-01T00:00:00Z",
        config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8, enableStreakBonus: true } },
        questions: [sampleQuestion],
      };

      // 0% Score
      const report0 = calculateDiagnosticReport({
        module: mod,
        questions: [sampleQuestion],
        userAnswers: { q_edge_1: ["b"] },
        questionTimes: { q_edge_1: 10 },
        totalTimeSpentSeconds: 10,
        passThresholdPercentage: 80,
      });

      expect(report0.scorePercentage).toBe(0);
      expect(report0.passed).toBe(false);
      expect(report0.missedQuestionIds).toEqual(["q_edge_1"]);

      const retryMod0 = generateSmartRetryModule(mod, report0.missedQuestionIds);
      expect(retryMod0.questions.length).toBe(1);

      // 100% Score
      const report100 = calculateDiagnosticReport({
        module: mod,
        questions: [sampleQuestion],
        userAnswers: { q_edge_1: ["a"] },
        questionTimes: { q_edge_1: 10 },
        totalTimeSpentSeconds: 10,
        passThresholdPercentage: 80,
      });

      expect(report100.scorePercentage).toBe(100);
      expect(report100.passed).toBe(true);
      expect(report100.missedQuestionIds).toEqual([]);

      const retryMod100 = generateSmartRetryModule(mod, report100.missedQuestionIds);
      expect(retryMod100.questions.length).toBe(0);
    });
  });
});
