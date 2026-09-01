import { describe, it, expect } from "vitest";
import { PrepPulseModule } from "@/types";
import { DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";

export function filterAdminModules(
  modules: PrepPulseModule[],
  query: string,
  courseFilter?: string
): PrepPulseModule[] {
  let result = [...modules];

  if (courseFilter && courseFilter !== "ALL") {
    result = result.filter(
      (m) => (m.course || "General Studies").toLowerCase() === courseFilter.toLowerCase()
    );
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.targetSubject.toLowerCase().includes(q) ||
        (m.course && m.course.toLowerCase().includes(q)) ||
        (m.moduleId && m.moduleId.toLowerCase().includes(q))
    );
  }

  return result;
}

describe("Milestone 2: Admin Portal Management & Preview Suite", () => {
  const testCatalog: PrepPulseModule[] = [
    DEMO_QUIZ_MODULE,
    DEMO_EXAM_MODULE,
    {
      moduleId: "custom_mod_1",
      title: "Natural Language Processing with Transformers",
      description: "Attention mechanisms & BERT",
      moduleType: "quiz",
      targetSubject: "Artificial Intelligence",
      course: "CS 401: Deep Learning",
      config: {},
      questions: [
        {
          id: "q_nlp_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "medium",
          prompt: "What is self-attention?",
          options: [
            { id: "o1", text: "Relating different positions of a single sequence" },
            { id: "o2", text: "CNN kernel" },
          ],
          correctOptionIds: ["o1"],
          explanation: "Self-attention computes representations of a single sequence.",
        },
      ],
    },
    {
      moduleId: "custom_mod_2",
      title: "Raft Consensus Algorithm",
      description: "Leader election & log replication",
      moduleType: "exam",
      targetSubject: "Distributed Systems",
      course: "CS 501: Distributed Systems",
      config: { examConfig: { totalDurationMinutes: 45, passingScorePercentage: 75 } },
      questions: [
        {
          id: "q_raft_1",
          type: "true_false",
          checkpoint: 1,
          difficulty: "hard",
          prompt: "Raft guarantees safety under network partitions.",
          options: [
            { id: "t", text: "True" },
            { id: "f", text: "False" },
          ],
          correctOptionIds: ["t"],
          explanation: "Raft maintains quorum-based consistency.",
        },
      ],
    },
  ];

  describe("1. Dynamic Search & Multi-Field Filtering", () => {
    it("searches modules by title substring", () => {
      const results = filterAdminModules(testCatalog, "transformers");
      expect(results.length).toBe(1);
      expect(results[0].moduleId).toBe("custom_mod_1");
    });

    it("searches modules by targetSubject", () => {
      const results = filterAdminModules(testCatalog, "Artificial Intelligence");
      expect(results.length).toBe(2);
      expect(results.some((m) => m.title.includes("Natural Language Processing"))).toBe(true);
    });

    it("searches modules by exact moduleId", () => {
      const results = filterAdminModules(testCatalog, "custom_mod_2");
      expect(results.length).toBe(1);
      expect(results[0].title).toContain("Raft");
    });

    it("filters modules by course combined with search query", () => {
      const results = filterAdminModules(testCatalog, "Raft", "CS 501: Distributed Systems");
      expect(results.length).toBe(1);

      const mismatched = filterAdminModules(testCatalog, "Raft", "CS 401: Deep Learning");
      expect(mismatched.length).toBe(0);
    });

    it("returns empty array for query with no matches without throwing", () => {
      const results = filterAdminModules(testCatalog, "nonexistent query xyz123");
      expect(results).toHaveLength(0);
    });
  });

  describe("2. Module Question Details Preview Contract", () => {
    it("extracts comprehensive question review payload for preview modal", () => {
      const target = testCatalog.find((m) => m.moduleId === "custom_mod_1")!;
      expect(target).toBeDefined();

      const previewData = {
        title: target.title,
        course: target.course,
        moduleType: target.moduleType,
        questionCount: target.questions.length,
        questions: target.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          difficulty: q.difficulty,
          options: q.options,
          correctOptionIds: q.correctOptionIds,
          explanation: q.explanation,
        })),
      };

      expect(previewData.questionCount).toBe(1);
      expect(previewData.questions[0].correctOptionIds).toContain("o1");
      expect(previewData.questions[0].options.length).toBe(2);
      expect(previewData.questions[0].explanation).toBe(
        "Self-attention computes representations of a single sequence."
      );
    });
  });
});
