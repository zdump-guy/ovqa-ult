/**
 * Tier 2: Boundary & Corner Cases - R3. Course Assignment, Filtering & Accordion Grouping Boundaries
 * Covers:
 * - Boundary 6: Course Assignment Boundaries (Whitespace strings, extreme lengths, special chars/emojis, atomic batch moves)
 * - Boundary 7: Course Filtering Boundaries (Non-existent courses, unassigned filtering, case sensitivity, single course libraries)
 * - Boundary 8: Accordion Grouping Boundaries (Empty lists, single-course collapse, unassigned grouping, manage mode preservation)
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
  updateLocalCustomModuleCourse,
  updateLocalCustomModulesCourse,
  extractCourseTabs,
  filterModulesByCourse,
  groupModulesByCourse,
  LibraryManageEngine,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_BIO_MODULE,
  SAMPLE_UNASSIGNED_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R3. Course Assignment, Filtering & Grouping Boundaries (Tier 2)", () => {
  /* =========================================================================
     Boundary 6: Course Assignment Boundaries
     ========================================================================= */
  it("T2.6.1: Empty or whitespace-only course string is trimmed and falls back to 'Unassigned'", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "ws_course_mod", course: "   " });

    updateLocalCustomModuleCourse(storage, "ws_course_mod", "   ");

    const stored = getLocalCustomModules(storage)[0];
    expect(stored.course).toBe("");

    const tabs = extractCourseTabs([stored]);
    expect(tabs.some((t) => t.id === "Unassigned")).toBe(true);
  });

  it("T2.6.2: Extremely long course names (150+ chars) are stored without truncation or schema failure", () => {
    const longCourse = "DEPARTMENT OF ADVANCED COMPUTATIONAL NEUROSCIENCE & DISTRIBUTED ROBOTICS: CS 999 - FORMAL METHODS FOR LARGE SCALE PARALLEL SYSTEM VERIFICATION AND BENCHMARKING";
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "long_c_mod", course: longCourse });

    const stored = getLocalCustomModules(storage)[0];
    expect(stored.course).toBe(longCourse);
    expect(stored.course?.length).toBeGreaterThan(150);
  });

  it("T2.6.3: Course names with special characters, punctuation, and emojis (e.g. CS & AI: 🚀 Machine Learning) supported", () => {
    const emojiCourse = "CS & AI: 🚀 Machine Learning / 2026";
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "emoji_c_mod", course: emojiCourse });

    const stored = getLocalCustomModules(storage)[0];
    expect(stored.course).toBe(emojiCourse);

    const tabs = extractCourseTabs([stored]);
    expect(tabs.some((t) => t.id === emojiCourse)).toBe(true);
  });

  it("T2.6.4: Batch moving 20+ modules to a new course updates all modules atomically", () => {
    const storage = new MockLocalStorage();
    const ids: string[] = [];

    for (let i = 0; i < 20; i++) {
      const id = `move_test_${i}`;
      ids.push(id);
      saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: id, course: "Old Course" });
    }

    const movedCount = updateLocalCustomModulesCourse(storage, ids, "New Target Course");
    expect(movedCount).toBe(20);

    const allStored = getLocalCustomModules(storage);
    expect(allStored.every((m) => m.course === "New Target Course")).toBe(true);
  });

  it("T2.6.5: Moving modules to their current course is a safe no-op that leaves count unchanged", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "noop_mod", course: "CS 401" });

    const count = updateLocalCustomModulesCourse(storage, ["noop_mod"], "CS 401");
    expect(count).toBe(1);

    const stored = getLocalCustomModules(storage)[0];
    expect(stored.course).toBe("CS 401");
  });

  /* =========================================================================
     Boundary 7: Course Filtering Boundaries
     ========================================================================= */
  it("T2.7.1: Filtering by a course name that has 0 matching modules returns empty array without error", () => {
    const library = [SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE];
    const filtered = filterModulesByCourse(library, "Non Existent Course XYZ");

    expect(filtered).toHaveLength(0);
  });

  it("T2.7.2: Filtering by 'Unassigned' correctly isolates modules with undefined or empty course", () => {
    const library = [
      SAMPLE_QUIZ_MODULE,       // CS 401
      SAMPLE_UNASSIGNED_MODULE, // undefined
      { ...SAMPLE_BIO_MODULE, course: "" }, // empty string
    ];

    const unassignedFiltered = filterModulesByCourse(library, "Unassigned");
    expect(unassignedFiltered.length).toBe(2);
  });

  it("T2.7.3: Case-insensitive course filter matching handles varying casing gracefully", () => {
    const library = [{ ...SAMPLE_QUIZ_MODULE, course: "CS 401: Deep Learning" }];

    const filteredLower = filterModulesByCourse(library, "cs 401: deep learning");
    expect(filteredLower.length).toBe(1);

    const filteredUpper = filterModulesByCourse(library, "CS 401: DEEP LEARNING");
    expect(filteredUpper.length).toBe(1);
  });

  it("T2.7.4: Filter tabs generation with mixed assigned and unassigned modules aggregates accurately", () => {
    const library = [
      { ...SAMPLE_QUIZ_MODULE, course: "CS 100" },
      { ...SAMPLE_EXAM_MODULE, course: "CS 100" },
      SAMPLE_UNASSIGNED_MODULE,
    ];

    const tabs = extractCourseTabs(library);
    expect(tabs.length).toBe(3); // ALL (3), CS 100 (2), Unassigned (1)
    expect(tabs.find((t) => t.id === "ALL")?.count).toBe(3);
    expect(tabs.find((t) => t.id === "CS 100")?.count).toBe(2);
    expect(tabs.find((t) => t.id === "Unassigned")?.count).toBe(1);
  });

  it("T2.7.5: Library where all modules belong to a single course generates exactly 2 tabs (All Courses and that Course)", () => {
    const library = [
      { ...SAMPLE_QUIZ_MODULE, course: "BIO 101" },
      { ...SAMPLE_BIO_MODULE, course: "BIO 101" },
    ];

    const tabs = extractCourseTabs(library);
    expect(tabs.length).toBe(2);
    expect(tabs[0].id).toBe("ALL");
    expect(tabs[1].id).toBe("BIO 101");
    expect(tabs[0].count).toBe(2);
    expect(tabs[1].count).toBe(2);
  });

  /* =========================================================================
     Boundary 8: Accordion Grouping Boundaries
     ========================================================================= */
  it("T2.8.1: Collapsing and re-expanding multiple accordion sections maintains independent collapse state", () => {
    const engine = new LibraryManageEngine();
    engine.toggleAccordion("CS 401");
    engine.toggleAccordion("BIO 101");

    expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(true);
    expect(engine.collapsedAccordionCourses.has("BIO 101")).toBe(true);
    expect(engine.collapsedAccordionCourses.has("MATH 220")).toBe(false);

    engine.toggleAccordion("CS 401");
    expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(false);
    expect(engine.collapsedAccordionCourses.has("BIO 101")).toBe(true);
  });

  it("T2.8.2: Grouping an empty list of modules produces empty accordion groups without crashing", () => {
    const grouped = groupModulesByCourse([]);
    expect(Object.keys(grouped).length).toBe(0);
  });

  it("T2.8.3: Single-course library creates a single accordion group with accurate count", () => {
    const library = [{ ...SAMPLE_QUIZ_MODULE, course: "PHYS 101" }];
    const grouped = groupModulesByCourse(library);

    expect(Object.keys(grouped).length).toBe(1);
    expect(grouped["PHYS 101"].length).toBe(1);
  });

  it("T2.8.4: Unassigned modules create an 'Unassigned' accordion section placed alongside named courses", () => {
    const library = [SAMPLE_QUIZ_MODULE, SAMPLE_UNASSIGNED_MODULE];
    const grouped = groupModulesByCourse(library);

    expect(grouped["Unassigned"]).toBeDefined();
    expect(grouped["Unassigned"].length).toBe(1);
    expect(grouped["CS 401: Deep Learning"].length).toBe(1);
  });

  it("T2.8.5: Toggling accordion collapse while in Manage mode does not clear active checkbox selections", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    engine.toggleSelect("mod_1");
    engine.toggleSelect("mod_2");
    expect(engine.getSelectionCount()).toBe(2);

    // Toggle collapse
    engine.toggleAccordion("CS 401");
    expect(engine.getSelectionCount()).toBe(2);
    expect(engine.selectedIds.has("mod_1")).toBe(true);
    expect(engine.selectedIds.has("mod_2")).toBe(true);
  });
}, "Tier 2", "R3: Course Grouping & Accordion Boundaries");
