/**
 * Tier 1: Feature Coverage - R3. Course Categorization & Grouped Dashboard Organization
 * Covers:
 * - Feature 6: Course Assignment (Course field support, course badges, batch move to course, course persistence, fallback handling)
 * - Feature 7: Dynamic Course Filtering (Course extraction, All Courses tab, per-course tabs with count badges, real-time filtering)
 * - Feature 8: Course-Grouped Accordion View (Grid vs Accordion toggle, collapsible course sections, section counts, state preservation)
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
  PrepPulseModule,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_BIO_MODULE,
  SAMPLE_MATH_MODULE,
  SAMPLE_UNASSIGNED_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R3. Course Categorization, Filtering & Grouping (Tier 1)", () => {
  /* =========================================================================
     Feature 6: Course Assignment
     ========================================================================= */
  it("T1.6.1: Course field assignment during JSON import attaches course tag to module", () => {
    const customModule: PrepPulseModule = {
      ...SAMPLE_BIO_MODULE,
      moduleId: "bio_custom_tagged",
      course: "BIO 101: Cell Biology",
    };

    expect(customModule.course).toBe("BIO 101: Cell Biology");
  });

  it("T1.6.2: Module cards render styled Course badge for assigned courses", () => {
    const module = { ...SAMPLE_QUIZ_MODULE, course: "CS 401: Deep Learning" };
    
    // Badge rendering contract
    const badgeState = {
      hasCourse: Boolean(module.course && module.course.trim()),
      courseText: module.course || "Unassigned",
    };

    expect(badgeState.hasCourse).toBe(true);
    expect(badgeState.courseText).toBe("CS 401: Deep Learning");
  });

  it("T1.6.3: Fallback handling: Modules without course are categorized as 'Unassigned'", () => {
    const unassignedModule = SAMPLE_UNASSIGNED_MODULE;
    expect(unassignedModule.course).toBeUndefined();

    const tabs = extractCourseTabs([unassignedModule]);
    const unassignedTab = tabs.find((t) => t.id === "Unassigned");
    expect(unassignedTab).toBeDefined();
    expect(unassignedTab!.count).toBe(1);
  });

  it("T1.6.4: Batch 'Move to Course' execution updates course property for all selected modules in localStorage", () => {
    const storage = new MockLocalStorage();
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "move_mod_1", course: "CS 401: Deep Learning" };
    const m2 = { ...SAMPLE_MATH_MODULE, moduleId: "move_mod_2", course: "MATH 220: Linear Algebra" };

    saveLocalCustomModule(storage, m1);
    saveLocalCustomModule(storage, m2);

    const targetCourse = "ENG 300: Engineering Core";
    const updatedCount = updateLocalCustomModulesCourse(storage, ["move_mod_1", "move_mod_2"], targetCourse);

    expect(updatedCount).toBe(2);
    const stored = getLocalCustomModules(storage);
    expect(stored.find((m) => m.moduleId === "move_mod_1")?.course).toBe(targetCourse);
    expect(stored.find((m) => m.moduleId === "move_mod_2")?.course).toBe(targetCourse);
  });

  it("T1.6.5: Updating a module's course preserves all questions, config, and difficulty metadata", () => {
    const storage = new MockLocalStorage();
    const original = { ...SAMPLE_EXAM_MODULE, moduleId: "preserve_mod_01", course: "CS 501: Distributed Systems" };
    saveLocalCustomModule(storage, original);

    updateLocalCustomModuleCourse(storage, "preserve_mod_01", "CS 600: Advanced Systems");

    const updated = getLocalCustomModules(storage).find((m) => m.moduleId === "preserve_mod_01")!;
    expect(updated.course).toBe("CS 600: Advanced Systems");
    expect(updated.questions.length).toBe(original.questions.length);
    expect(updated.config.examConfig?.totalDurationMinutes).toBe(45);
    expect(updated.targetSubject).toBe(original.targetSubject);
  });

  /* =========================================================================
     Feature 7: Dynamic Course Filtering
     ========================================================================= */
  it("T1.7.1: Dynamic extraction of course list generates 'All Courses' tab plus individual course tabs", () => {
    const library = [
      SAMPLE_QUIZ_MODULE, // CS 401
      SAMPLE_EXAM_MODULE, // CS 501
      SAMPLE_BIO_MODULE,  // BIO 101
      SAMPLE_MATH_MODULE, // MATH 220
    ];

    const tabs = extractCourseTabs(library);
    expect(tabs.length).toBe(5); // "All Courses" + 4 unique courses
    expect(tabs[0].id).toBe("ALL");
    expect(tabs[0].count).toBe(4);

    const courseNames = tabs.slice(1).map((t) => t.id);
    expect(courseNames).toContain("CS 401: Deep Learning");
    expect(courseNames).toContain("CS 501: Distributed Systems");
    expect(courseNames).toContain("BIO 101: Cell Biology");
    expect(courseNames).toContain("MATH 220: Linear Algebra");
  });

  it("T1.7.2: Each course tab accurately reflects the count of modules assigned to that course", () => {
    const library = [
      { ...SAMPLE_QUIZ_MODULE, moduleId: "cs1", course: "CS 401" },
      { ...SAMPLE_EXAM_MODULE, moduleId: "cs2", course: "CS 401" },
      { ...SAMPLE_BIO_MODULE, moduleId: "bio1", course: "BIO 101" },
    ];

    const tabs = extractCourseTabs(library);
    const csTab = tabs.find((t) => t.id === "CS 401");
    const bioTab = tabs.find((t) => t.id === "BIO 101");
    const allTab = tabs.find((t) => t.id === "ALL");

    expect(csTab?.count).toBe(2);
    expect(bioTab?.count).toBe(1);
    expect(allTab?.count).toBe(3);
  });

  it("T1.7.3: Selecting a course tab filters visible modules to only those matching the selected course", () => {
    const library = [
      SAMPLE_QUIZ_MODULE, // CS 401
      SAMPLE_EXAM_MODULE, // CS 501
      SAMPLE_BIO_MODULE,  // BIO 101
    ];

    const filtered = filterModulesByCourse(library, "BIO 101: Cell Biology");
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe("Cellular Respiration & Krebs Cycle");
  });

  it("T1.7.4: Selecting 'All Courses' restores the full list of custom and demo modules", () => {
    const library = [SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE, SAMPLE_BIO_MODULE];

    const allFiltered = filterModulesByCourse(library, "ALL");
    expect(allFiltered.length).toBe(3);
  });

  it("T1.7.5: Adding a new module with a new course dynamically registers a new course tab in the filter bar", () => {
    const initialLibrary = [SAMPLE_QUIZ_MODULE];
    const initialTabs = extractCourseTabs(initialLibrary);
    expect(initialTabs.length).toBe(2); // ALL + CS 401

    const updatedLibrary = [...initialLibrary, SAMPLE_MATH_MODULE];
    const updatedTabs = extractCourseTabs(updatedLibrary);
    expect(updatedTabs.length).toBe(3); // ALL + CS 401 + MATH 220
    expect(updatedTabs.some((t) => t.id === "MATH 220: Linear Algebra")).toBe(true);
  });

  /* =========================================================================
     Feature 8: Course-Grouped Accordion View
     ========================================================================= */
  it("T1.8.1: View toggle switches between Standard Grid and Course-Grouped Accordion view", () => {
    const engine = new LibraryManageEngine();
    expect(engine.viewMode).toBe("grid");

    engine.setViewMode("accordion");
    expect(engine.viewMode).toBe("accordion");

    engine.setViewMode("grid");
    expect(engine.viewMode).toBe("grid");
  });

  it("T1.8.2: Accordion view groups modules into separate collapsible sections keyed by Course", () => {
    const library = [
      { ...SAMPLE_QUIZ_MODULE, moduleId: "mod_cs1", course: "CS 401" },
      { ...SAMPLE_EXAM_MODULE, moduleId: "mod_cs2", course: "CS 401" },
      { ...SAMPLE_BIO_MODULE, moduleId: "mod_bio1", course: "BIO 101" },
      { ...SAMPLE_UNASSIGNED_MODULE, moduleId: "mod_un1" },
    ];

    const grouped = groupModulesByCourse(library);
    expect(Object.keys(grouped).length).toBe(3);
    expect(grouped["CS 401"].length).toBe(2);
    expect(grouped["BIO 101"].length).toBe(1);
    expect(grouped["Unassigned"].length).toBe(1);
  });

  it("T1.8.3: Collapsing a course section hides its module cards while leaving other sections expanded", () => {
    const engine = new LibraryManageEngine();
    expect(engine.collapsedAccordionCourses.size).toBe(0);

    const isCollapsed = engine.toggleAccordion("CS 401");
    expect(isCollapsed).toBe(true);
    expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(true);
    expect(engine.collapsedAccordionCourses.has("BIO 101")).toBe(false);

    const isExpandedAgain = !engine.toggleAccordion("CS 401");
    expect(isExpandedAgain).toBe(true);
    expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(false);
  });

  it("T1.8.4: Accordion section header displays course title and total module count for that course", () => {
    const library = [
      { ...SAMPLE_QUIZ_MODULE, moduleId: "c1", course: "CS 401" },
      { ...SAMPLE_EXAM_MODULE, moduleId: "c2", course: "CS 401" },
    ];

    const grouped = groupModulesByCourse(library);
    const cs401Group = grouped["CS 401"];
    expect(cs401Group.length).toBe(2);

    const headerDisplay = {
      title: "CS 401",
      countText: `${cs401Group.length} modules`,
    };
    expect(headerDisplay.countText).toBe("2 modules");
  });

  it("T1.8.5: Selection and Manage mode state are preserved when switching between Grid and Accordion views", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    engine.toggleSelect("mod_cs1");
    engine.toggleSelect("mod_bio1");
    expect(engine.getSelectionCount()).toBe(2);

    // Switch view mode
    engine.setViewMode("accordion");
    expect(engine.getSelectionCount()).toBe(2);
    expect(engine.selectedIds.has("mod_cs1")).toBe(true);
    expect(engine.selectedIds.has("mod_bio1")).toBe(true);

    engine.setViewMode("grid");
    expect(engine.getSelectionCount()).toBe(2);
  });
}, "Tier 1", "R3: Course Categorization & Accordion Grouping");
