import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { useExamSession, formatDuration } from "@/lib/exam/useExamSession";
import { QuestionNavigationGrid } from "@/components/exam/QuestionNavigationGrid";
import { ExamQuestionViewer } from "@/components/exam/ExamQuestionViewer";
import { SubmitConfirmationModal } from "@/components/exam/SubmitConfirmationModal";
import { POST, GET } from "@/app/api/sessions/route";
import { PrepPulseModule } from "@/types";
import { NextRequest } from "next/server";

// Sample Test Exam Module
const TEST_EXAM_MODULE: PrepPulseModule = {
  moduleId: "test-exam-sim-1",
  title: "Test Distributed Systems & Cloud Architecture",
  description: "Test exam module for unit verification of mock simulator",
  moduleType: "exam",
  targetSubject: "Distributed Systems",
  config: {
    examConfig: {
      totalDurationMinutes: 45,
      passingScorePercentage: 60,
      shuffleQuestions: false,
      shuffleOptions: false,
      allowReview: true,
    },
  },
  questions: [
    {
      id: "q_sim_01",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is the CAP Theorem partition tolerance trade-off?",
      options: [
        { id: "opt_1a", text: "Consistency vs Availability during partition" },
        { id: "opt_1b", text: "Latency vs Throughput" },
        { id: "opt_1c", text: "Durability vs Compression" },
        { id: "opt_1d", text: "Bandwidth vs Security" },
      ],
      correctOptionIds: ["opt_1a"],
      explanation: "CAP theorem states you must choose C or A when partition P occurs.",
      sourceReference: "Lynch & Sethi",
    },
    {
      id: "q_sim_02",
      type: "multi_select",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "Which of the following are consensus algorithms? (Select all that apply)",
      options: [
        { id: "opt_2a", text: "Raft" },
        { id: "opt_2b", text: "Paxos" },
        { id: "opt_2c", text: "Quicksort" },
        { id: "opt_2d", text: "Zab" },
      ],
      correctOptionIds: ["opt_2a", "opt_2b", "opt_2d"],
      explanation: "Raft, Paxos, and Zab are consensus algorithms; Quicksort is a sorting algorithm.",
      sourceReference: "Consensus in Distributed Systems",
    },
    {
      id: "q_sim_03",
      type: "true_false",
      checkpoint: 1,
      difficulty: "hard",
      prompt: "Two-Phase Commit (2PC) is a non-blocking consensus protocol that never hangs on coordinator crash.",
      options: [
        { id: "opt_3true", text: "True" },
        { id: "opt_3false", text: "False" },
      ],
      correctOptionIds: ["opt_3false"],
      explanation: "2PC is blocking: participants hold locks indefinitely if coordinator fails.",
      sourceReference: "Database Systems",
    },
    {
      id: "q_sim_04",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is the purpose of Consistent Hashing?",
      options: [
        { id: "opt_4a", text: "Uniform key distribution with minimal remapping on node scaling" },
        { id: "opt_4b", text: "Encrypting database disk pages" },
      ],
      correctOptionIds: ["opt_4a"],
      explanation: "Consistent hashing minimizes keys moved when nodes join/leave.",
    },
  ],
};

describe("Milestone 4: Comprehensive Mock Exam Simulator & Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. formatDuration helper", () => {
    it("formats seconds into HH:MM:SS or MM:SS accurately", () => {
      expect(formatDuration(45 * 60)).toBe("45:00");
      expect(formatDuration(3665)).toBe("01:01:05");
      expect(formatDuration(59)).toBe("00:59");
      expect(formatDuration(0)).toBe("00:00");
      expect(formatDuration(-10)).toBe("00:00");
    });
  });

  describe("2. useExamSession Hook State Machine", () => {
    it("initializes with full duration countdown, index 0, and clean state", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.questions.length).toBe(4);
      expect(result.current.currentQuestion?.id).toBe("q_sim_01");
      expect(result.current.totalDurationSeconds).toBe(45 * 60);
      expect(result.current.timeRemainingSeconds).toBe(45 * 60);
      expect(result.current.formattedTimeRemaining).toBe("45:00");
      expect(result.current.isSubmitted).toBe(false);
      expect(result.current.isTimeExpired).toBe(false);
      expect(Object.keys(result.current.userAnswers).length).toBe(0);
      expect(result.current.flaggedQuestionIds.size).toBe(0);
    });

    it("ticks seconds and decrements countdown timer", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      const initialTime = result.current.timeRemainingSeconds;

      act(() => {
        result.current.tickSecond();
      });

      expect(result.current.timeRemainingSeconds).toBe(initialTime - 1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timeRemainingSeconds).toBe(initialTime - 6);
    });

    it("handles single-choice answer selection (replaces selection)", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1a");
      });

      expect(result.current.userAnswers["q_sim_01"]).toEqual(["opt_1a"]);

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1b");
      });

      expect(result.current.userAnswers["q_sim_01"]).toEqual(["opt_1b"]);
    });

    it("handles multi-select answer toggling (adds and removes options)", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_02", "opt_2a");
      });
      expect(result.current.userAnswers["q_sim_02"]).toEqual(["opt_2a"]);

      act(() => {
        result.current.selectOption("q_sim_02", "opt_2b");
      });
      expect(result.current.userAnswers["q_sim_02"]).toEqual(["opt_2a", "opt_2b"]);

      // Unselect opt_2a
      act(() => {
        result.current.selectOption("q_sim_02", "opt_2a");
      });
      expect(result.current.userAnswers["q_sim_02"]).toEqual(["opt_2b"]);

      // Unselect opt_2b
      act(() => {
        result.current.selectOption("q_sim_02", "opt_2b");
      });
      expect(result.current.userAnswers["q_sim_02"]).toEqual([]);
    });

    it("allows clearing answers via clearAnswer", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1a");
      });
      expect(result.current.userAnswers["q_sim_01"]).toEqual(["opt_1a"]);

      act(() => {
        result.current.clearAnswer("q_sim_01");
      });
      expect(result.current.userAnswers["q_sim_01"]).toBeUndefined();
    });

    it("toggles flag status for questions and responds to 'F' keyboard shortcut", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      let isFlagged = false;
      act(() => {
        isFlagged = result.current.toggleFlag("q_sim_01");
      });
      expect(isFlagged).toBe(true);
      expect(result.current.flaggedQuestionIds.has("q_sim_01")).toBe(true);

      act(() => {
        isFlagged = result.current.toggleFlag("q_sim_01");
      });
      expect(isFlagged).toBe(false);
      expect(result.current.flaggedQuestionIds.has("q_sim_01")).toBe(false);

      // Test window keydown event for 'f'
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
      });
      expect(result.current.flaggedQuestionIds.has("q_sim_01")).toBe(true);
    });

    it("navigates forward, backward, and directly with boundary protection", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.nextQuestion();
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentQuestion?.id).toBe("q_sim_02");

      act(() => {
        result.current.navigateTo(3);
      });
      expect(result.current.currentIndex).toBe(3);
      expect(result.current.currentQuestion?.id).toBe("q_sim_04");

      act(() => {
        result.current.prevQuestion();
      });
      expect(result.current.currentIndex).toBe(2);

      expect(() => {
        act(() => {
          result.current.navigateTo(-1);
        });
      }).toThrow("Invalid navigation index -1");

      expect(() => {
        act(() => {
          result.current.navigateTo(10);
        });
      }).toThrow("Invalid navigation index 10");
    });

    it("computes accurate 4-state question details (active, answered, flagged, unanswered)", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1a");
        result.current.toggleFlag("q_sim_02");
        result.current.navigateTo(2);
      });

      // Question 1: answered (not active)
      const q1State = result.current.getQuestionState("q_sim_01");
      expect(q1State.state).toBe("answered");
      expect(q1State.isAnswered).toBe(true);
      expect(q1State.isActive).toBe(false);

      // Question 2: flagged (not active, not answered)
      const q2State = result.current.getQuestionState("q_sim_02");
      expect(q2State.state).toBe("flagged");
      expect(q2State.isFlagged).toBe(true);
      expect(q2State.isAnswered).toBe(false);

      // Question 3: active
      const q3State = result.current.getQuestionState("q_sim_03");
      expect(q3State.state).toBe("active");
      expect(q3State.isActive).toBe(true);

      // Question 4: unanswered
      const q4State = result.current.getQuestionState("q_sim_04");
      expect(q4State.state).toBe("unanswered");
      expect(q4State.isAnswered).toBe(false);
      expect(q4State.isFlagged).toBe(false);
      expect(q4State.isActive).toBe(false);
    });

    it("generates review drawer summary metrics accurately", () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1a");
        result.current.selectOption("q_sim_03", "opt_3false");
        result.current.toggleFlag("q_sim_02");
      });

      const summary = result.current.getReviewDrawerSummary();
      expect(summary.totalQuestions).toBe(4);
      expect(summary.answeredCount).toBe(2);
      expect(summary.unansweredCount).toBe(2);
      expect(summary.flaggedCount).toBe(1);
      expect(summary.percentageAnswered).toBe(50);
      expect(summary.unansweredIds).toEqual(["q_sim_02", "q_sim_04"]);
      expect(summary.flaggedIds).toEqual(["q_sim_02"]);
    });

    it("persists to LocalStorage and recovers gracefully across sessions", () => {
      const storageKey = `preppulse_exam_session_${TEST_EXAM_MODULE.moduleId}`;

      // Session 1: Make edits
      const { result: session1 } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: true })
      );

      act(() => {
        session1.current.selectOption("q_sim_01", "opt_1a");
        session1.current.toggleFlag("q_sim_03");
        session1.current.navigateTo(1);
      });

      // Verify item saved in localStorage
      const rawStored = localStorage.getItem(storageKey);
      expect(rawStored).not.toBeNull();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.answers["q_sim_01"]).toEqual(["opt_1a"]);
      expect(parsed.flaggedQuestionIds).toContain("q_sim_03");
      expect(parsed.currentQuestionIndex).toBe(1);

      // Session 2: Hydrate from localStorage
      const { result: session2 } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: true })
      );

      expect(session2.current.userAnswers["q_sim_01"]).toEqual(["opt_1a"]);
      expect(session2.current.flaggedQuestionIds.has("q_sim_03")).toBe(true);
      expect(session2.current.currentIndex).toBe(1);
    });

    it("handles corrupt LocalStorage payload without crashing", () => {
      const storageKey = `preppulse_exam_session_${TEST_EXAM_MODULE.moduleId}`;
      localStorage.setItem(storageKey, "{ corrupted -- json -- invalid }");

      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: true })
      );

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.timeRemainingSeconds).toBe(45 * 60);
      expect(Object.keys(result.current.userAnswers).length).toBe(0);
    });

    it("freezes answer changes and flags after submission", async () => {
      const { result } = renderHook(() =>
        useExamSession(TEST_EXAM_MODULE, { autoRestore: false })
      );

      act(() => {
        result.current.selectOption("q_sim_01", "opt_1a");
      });

      await act(async () => {
        await result.current.submitExam();
      });

      expect(result.current.isSubmitted).toBe(true);

      expect(() => {
        act(() => {
          result.current.selectOption("q_sim_02", "opt_2a");
        });
      }).toThrow("Exam already submitted");

      expect(() => {
        act(() => {
          result.current.toggleFlag("q_sim_01");
        });
      }).toThrow("Exam already submitted");
    });
  });

  describe("3. QuestionNavigationGrid Component", () => {
    it("renders matrix with 4-state buttons, counts, and triggers navigation", () => {
      const onSelectMock = vi.fn();
      const flaggedSet = new Set(["q_sim_02"]);
      const answers = { q_sim_01: ["opt_1a"] };

      render(
        React.createElement(QuestionNavigationGrid, {
          questions: TEST_EXAM_MODULE.questions,
          currentIndex: 2, // Question 3 is Active
          userAnswers: answers,
          flaggedQuestionIds: flaggedSet,
          onSelectQuestion: onSelectMock,
        })
      );

      // Verify header and question count
      expect(screen.getByText("Question Matrix")).toBeInTheDocument();
      expect(screen.getByText("1/4")).toBeInTheDocument();

      // Verify legend counts
      expect(screen.getByText(/Answered \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Flagged \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Unanswered \(3\)/)).toBeInTheDocument();

      // Button states
      const btn1 = screen.getByTestId("question-matrix-btn-1");
      const btn2 = screen.getByTestId("question-matrix-btn-2");
      const btn3 = screen.getByTestId("question-matrix-btn-3");
      const btn4 = screen.getByTestId("question-matrix-btn-4");

      expect(btn1).toHaveAttribute("data-state", "answered");
      expect(btn2).toHaveAttribute("data-state", "flagged");
      expect(btn3).toHaveAttribute("data-state", "active");
      expect(btn4).toHaveAttribute("data-state", "unanswered");

      // Click Question 4
      fireEvent.click(btn4);
      expect(onSelectMock).toHaveBeenCalledWith(3);
    });
  });

  describe("4. ExamQuestionViewer Component", () => {
    it("renders question prompt, options with A/B/C badges, difficulty, and triggers actions", () => {
      const selectOptionMock = vi.fn();
      const toggleFlagMock = vi.fn();
      const prevMock = vi.fn();
      const nextMock = vi.fn();
      const clearMock = vi.fn();

      render(
        React.createElement(ExamQuestionViewer, {
          question: TEST_EXAM_MODULE.questions[0],
          currentIndex: 0,
          totalQuestions: 4,
          selectedOptionIds: ["opt_1a"],
          isFlagged: false,
          onSelectOption: selectOptionMock,
          onClearAnswer: clearMock,
          onToggleFlag: toggleFlagMock,
          onPrevQuestion: prevMock,
          onNextQuestion: nextMock,
          isFirstQuestion: true,
          isLastQuestion: false,
        })
      );

      expect(screen.getByText(/Question 1/)).toBeInTheDocument();
      expect(screen.getByText("easy")).toBeInTheDocument();
      expect(
        screen.getByText("What is the CAP Theorem partition tolerance trade-off?")
      ).toBeInTheDocument();

      // Flag button click
      const flagBtn = screen.getByTestId("flag-question-btn");
      fireEvent.click(flagBtn);
      expect(toggleFlagMock).toHaveBeenCalledTimes(1);

      // Option click
      const optBtnB = screen.getByTestId("option-btn-opt_1b");
      fireEvent.click(optBtnB);
      expect(selectOptionMock).toHaveBeenCalledWith("opt_1b");

      // Clear answer click
      const clearBtn = screen.getByTestId("clear-answer-btn");
      fireEvent.click(clearBtn);
      expect(clearMock).toHaveBeenCalledTimes(1);

      // Previous button should be disabled on first question
      const prevBtn = screen.getByTestId("prev-question-btn");
      expect(prevBtn).toBeDisabled();

      // Next button click
      const nextBtn = screen.getByTestId("next-question-btn");
      fireEvent.click(nextBtn);
      expect(nextMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. SubmitConfirmationModal Component", () => {
    const summaryWithUnanswered = {
      totalQuestions: 4,
      answeredCount: 1,
      unansweredCount: 3,
      flaggedCount: 1,
      unansweredIds: ["q_sim_02", "q_sim_03", "q_sim_04"],
      flaggedIds: ["q_sim_02"],
      percentageAnswered: 25,
    };

    it("displays warning banner when unanswered questions remain and filters matrix", () => {
      const closeMock = vi.fn();
      const submitMock = vi.fn();
      const selectMock = vi.fn();

      render(
        React.createElement(SubmitConfirmationModal, {
          isOpen: true,
          onClose: closeMock,
          onConfirmSubmit: submitMock,
          summary: summaryWithUnanswered,
          questions: TEST_EXAM_MODULE.questions,
          userAnswers: { q_sim_01: ["opt_1a"] },
          flaggedQuestionIds: new Set(["q_sim_02"]),
          onSelectQuestion: selectMock,
        })
      );

      // Warning banner present
      expect(screen.getByTestId("unanswered-warning-banner")).toBeInTheDocument();
      expect(screen.getByText(/You have 3 unanswered questions!/)).toBeInTheDocument();

      // Filter tabs work
      const unansweredTab = screen.getByTestId("filter-tab-unanswered");
      fireEvent.click(unansweredTab);

      // Click Q2 in matrix to navigate
      const q2Btn = screen.getByTestId("review-matrix-item-2");
      fireEvent.click(q2Btn);
      expect(selectMock).toHaveBeenCalledWith(1);
      expect(closeMock).toHaveBeenCalledTimes(1);

      // Confirm submit click
      const submitBtn = screen.getByTestId("confirm-submit-exam-btn");
      fireEvent.click(submitBtn);
      expect(submitMock).toHaveBeenCalledTimes(1);
    });

    it("displays all-answered success banner when 0 unanswered questions", () => {
      const summaryAllAnswered = {
        totalQuestions: 4,
        answeredCount: 4,
        unansweredCount: 0,
        flaggedCount: 0,
        unansweredIds: [],
        flaggedIds: [],
        percentageAnswered: 100,
      };

      render(
        React.createElement(SubmitConfirmationModal, {
          isOpen: true,
          onClose: vi.fn(),
          onConfirmSubmit: vi.fn(),
          summary: summaryAllAnswered,
          questions: TEST_EXAM_MODULE.questions,
          userAnswers: {
            q_sim_01: ["opt_1a"],
            q_sim_02: ["opt_2a"],
            q_sim_03: ["opt_3false"],
            q_sim_04: ["opt_4a"],
          },
          flaggedQuestionIds: new Set(),
          onSelectQuestion: vi.fn(),
        })
      );

      expect(screen.getByTestId("all-answered-banner")).toBeInTheDocument();
      expect(screen.getByText(/All 4 questions answered!/)).toBeInTheDocument();
    });
  });

  describe("6. /api/sessions Route Handler", () => {
    it("validates and accepts full mock exam session persistence POST payload", async () => {
      const payload = {
        moduleId: "test-exam-sim-1",
        sessionType: "exam",
        status: "passed",
        totalQuestions: 4,
        correctAnswers: 3,
        scorePercentage: 75,
        timeSpentSeconds: 1200,
        checkpointReached: 1,
        breakdown: {
          totalQuestions: 4,
          correctCount: 3,
          scorePercentage: 75,
          passed: true,
          totalTimeSpentSeconds: 1200,
          averagePaceSeconds: 300,
          topicMastery: [],
          difficultyAccuracy: {
            easy: { total: 2, correct: 2, percentage: 100 },
            medium: { total: 1, correct: 1, percentage: 100 },
            hard: { total: 1, correct: 0, percentage: 0 },
          },
          timeTraps: [],
          rushedErrors: [],
          missedQuestionIds: ["q_sim_03"],
          questionReviews: [],
        },
      };

      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
      expect(json.session.moduleId).toBe("test-exam-sim-1");
      expect(json.session.scorePercentage).toBe(75);
    });

    it("rejects invalid session persistence payloads missing required fields", async () => {
      const invalidPayload = {
        sessionType: "exam",
        // missing moduleId and totalQuestions
      };

      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Invalid test session payload");
      expect(json.details).toBeDefined();
    });

    it("fetches test sessions via GET /api/sessions", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?moduleId=test-exam-sim-1&limit=5",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.sessions)).toBe(true);
    });
  });
});
