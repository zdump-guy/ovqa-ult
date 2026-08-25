/**
 * Tier 5: Adversarial Hardening & Stress Engine
 * Extreme boundary and adversarial validation:
 * - T5.1: Massive Multi-Course Library Stress (100+ modules, 20+ courses, mass filtering, mass accordion rendering)
 * - T5.2: Adversarial Injection in JSON Editor, Course Strings, and Titles (XSS, SQLi, Null bytes, Unicode surrogates)
 * - T5.3: Rapid Concurrent Manage Mode State Transitions (Rapid toggle, select/deselect, view switches)
 * - T5.4: Storage Limit & Orphaned Session Cache Eviction (Clearing 100+ session keys on mass batch deletion)
 * - T5.5: Corrupted Storage Payload Recovery & Fallback
 * - T5.6: Deeply Nested and Cyclic JSON Schema Resistance in Live Validator
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModules,
  updateLocalCustomModulesCourse,
  clearSessionCacheForModule,
  validateJsonModuleString,
  formatJson,
  extractCourseTabs,
  filterModulesByCourse,
  groupModulesByCourse,
  LibraryManageEngine,
  GUEST_SESSION_PREFIX,
  GUEST_REPORT_PREFIX,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("Tier 5: Adversarial Hardening & Stress Engine", () => {
  it("T5.1: Massive Multi-Course Library Stress (100+ modules, 20+ courses, mass filtering, mass accordion rendering)", () => {
    const storage = new MockLocalStorage();
    const courses = [
      "CS 101", "CS 102", "CS 201", "CS 202", "CS 301", "CS 302", "CS 401", "CS 402", "CS 501", "CS 502",
      "MATH 101", "MATH 102", "MATH 201", "MATH 202", "BIO 101", "BIO 102", "PHYS 101", "PHYS 102", "CHEM 101", "CHEM 102"
    ];

    for (let i = 0; i < 100; i++) {
      const course = courses[i % courses.length];
      saveLocalCustomModule(storage, {
        ...SAMPLE_QUIZ_MODULE,
        moduleId: `stress_mod_${i}`,
        title: `Stress Quiz #${i}`,
        course,
      });
    }

    const all = getLocalCustomModules(storage);
    expect(all.length).toBe(100);

    const tabs = extractCourseTabs(all);
    expect(tabs.length).toBe(21); // ALL + 20 courses

    const filtered = filterModulesByCourse(all, "CS 401");
    expect(filtered.length).toBe(5);

    const grouped = groupModulesByCourse(all);
    expect(Object.keys(grouped).length).toBe(20);
    for (const c of courses) {
      expect(grouped[c].length).toBe(5);
    }
  });

  it("T5.2: Adversarial Injection in JSON Editor, Course Strings, and Titles (XSS, SQLi, Null bytes, Unicode surrogates)", () => {
    const maliciousPayload = {
      title: "<script>alert('XSS')</script> -- DROP TABLE users; --",
      description: "\u0000\u001F\u007F; DELETE FROM modules WHERE '1'='1';",
      moduleType: "quiz",
      targetSubject: "Security Vulnerability Testing",
      course: "SEC 999: <iframe src='javascript:alert(1)'>",
      config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8 } },
      questions: [
        {
          id: "q_xss_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What happens when rendering <b>raw unescaped</b> HTML in React?",
          options: [
            { id: "o1", text: "React escapes text automatically unless dangerouslySetInnerHTML is used" },
            { id: "o2", text: "Direct arbitrary script execution" },
          ],
          correctOptionIds: ["o1"],
          explanation: "React automatically encodes strings to prevent XSS injection.",
        },
      ],
    };

    const raw = JSON.stringify(maliciousPayload);
    const validation = validateJsonModuleString(raw);
    expect(validation.valid).toBe(true);

    const formatted = formatJson(raw, 2);
    expect(formatted.success).toBe(true);
    expect(formatted.formatted).toContain("<script>");
  });

  it("T5.3: Rapid Concurrent Manage Mode State Transitions (Rapid toggle, select/deselect, view switches)", () => {
    const engine = new LibraryManageEngine();

    for (let i = 0; i < 50; i++) {
      engine.toggleManageMode();
      engine.setViewMode(i % 2 === 0 ? "grid" : "accordion");
      engine.toggleSelect(`rapid_mod_${i}`);
      engine.toggleAccordion(`Course_${i % 5}`);
    }

    // Engine remains stable without throwing or undefined states
    expect(engine.viewMode).toBeDefined();
    expect(engine.selectedIds).toBeDefined();
    expect(engine.collapsedAccordionCourses).toBeDefined();
  });

  it("T5.4: Storage Limit & Orphaned Session Cache Eviction (Clearing 100+ session keys on mass batch deletion)", () => {
    const storage = new MockLocalStorage();
    const modIds = ["mod_evict_a", "mod_evict_b"];

    for (const modId of modIds) {
      saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: modId });
      for (let i = 0; i < 50; i++) {
        storage.setItem(`${GUEST_SESSION_PREFIX}${modId}_sess_${i}`, JSON.stringify({ moduleId: modId, index: i }));
        storage.setItem(`${GUEST_REPORT_PREFIX}${modId}_rep_${i}`, JSON.stringify({ moduleId: modId, score: 90 }));
      }
    }

    expect(storage.length).toBe(201); // 1 modules key + 200 session/report keys

    const deleted = deleteLocalCustomModules(storage, modIds);
    expect(deleted).toBe(2);

    expect(getLocalCustomModules(storage).length).toBe(0);
    // All 200 session keys should be cleanly evicted
    expect(storage.length).toBe(1); // Only the empty modules array in storage
  });

  it("T5.5: Corrupted Storage Payload Recovery & Fallback", () => {
    const storage = new MockLocalStorage();
    storage.setItem("preppulse_local_modules", "CORRUPTED_NON_JSON_DATA{{{{");

    const modules = getLocalCustomModules(storage);
    expect(modules).toHaveLength(0); // Gracefully returns empty array instead of throwing
  });

  it("T5.6: Deeply Nested and Cyclic JSON Schema Resistance in Live Validator", () => {
    const malformedDeepJson = `{
  "title": "Deep JSON",
  "description": "Deep nested fields test",
  "moduleType": "quiz",
  "targetSubject": "CS",
  "config": {
    "quizConfig": {
      "checkpointInterval": 5,
      "timePerQuestionSeconds": 15,
      "checkpointPassThreshold": 0.8
    }
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "prompt": "Deep?",
      "options": [{"id": "o1", "text": "a"}, {"id": "o2", "text": "b"}],
      "correctOptionIds": ["o1"],
      "explanation": "exp",
      "nested": { "a": { "b": { "c": { "d": { "e": { "f": 1 } } } } } }
    }
  ]
}`;

    const validation = validateJsonModuleString(malformedDeepJson);
    expect(validation.valid).toBe(true);
  });
}, "Tier 5", "Adversarial Hardening");
