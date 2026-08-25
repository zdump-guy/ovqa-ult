import { describe, it, expect, beforeEach } from "vitest";
import {
  saveLocalCustomModule,
  getLocalCustomModules,
  updateLocalCustomModuleCourse,
  updateLocalCustomModulesCourse,
} from "@/lib/guest-session";
import {
  extractCourseTabs,
  filterModulesByCourse,
  groupModulesByCourse,
  LibraryManageEngine,
} from "../harness/mock-state";
import { PrepPulseModule } from "@/types";
import { DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";

describe("M8 / M4: Course Categorization, Dynamic Filtering & Accordion Grouping Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  const createModuleWithCourse = (
    id: string,
    title: string,
    course?: string,
    moduleType: "quiz" | "exam" = "quiz"
  ): PrepPulseModule => ({
    moduleId: id,
    title,
    description: `Description for ${title}`,
    moduleType,
    targetSubject: "Engineering & Computer Science",
    course,
    createdAt: new Date().toISOString(),
    config: {
      quizConfig: {
        checkpointInterval: 5,
        timePerQuestionSeconds: 15,
        checkpointPassThreshold: 0.8,
      },
      examConfig: {
        totalDurationMinutes: 45,
        passingScorePercentage: 60,
      },
    },
    questions: [
      {
        id: `q_${id}_01`,
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "medium",
        prompt: `Test question for ${title}`,
        options: [
          { id: "opt_1", text: "Option A" },
          { id: "opt_2", text: "Option B" },
        ],
        correctOptionIds: ["opt_1"],
        explanation: "Standard explanation",
      },
    ],
  });

  /* =========================================================================
     1. Course Field Assignment & Preservation
     ========================================================================= */
  describe("1. Course Assignment & Field Resilience", () => {
    it("persists assigned course in localStorage cleanly", () => {
      const mod = createModuleWithCourse("c_mod_1", "Compiler Design", "CS 450: Compilers");
      saveLocalCustomModule(mod);

      const loaded = getLocalCustomModules();
      expect(loaded.length).toBe(1);
      expect(loaded[0].course).toBe("CS 450: Compilers");
    });

    it("updates course of a single module via updateLocalCustomModuleCourse", () => {
      const mod = createModuleWithCourse("c_mod_2", "Database Systems", "CS 300: Old Course");
      saveLocalCustomModule(mod);

      const updated = updateLocalCustomModuleCourse("c_mod_2", "CS 420: Advanced Databases");
      expect(updated).toBe(true);

      const stored = getLocalCustomModules();
      expect(stored[0].course).toBe("CS 420: Advanced Databases");
    });

    it("trims course name whitespace upon update", () => {
      const mod = createModuleWithCourse("c_mod_trim", "Algorithms", "CS 201");
      saveLocalCustomModule(mod);

      updateLocalCustomModuleCourse("c_mod_trim", "   CS 301: Data Structures   ");

      const stored = getLocalCustomModules();
      expect(stored[0].course).toBe("CS 301: Data Structures");
    });

    it("preserves full question payload, config, and metadata when course is updated", () => {
      const original = createModuleWithCourse("c_mod_preserve", "Full Stack Dev", "CS 100", "exam");
      saveLocalCustomModule(original);

      updateLocalCustomModuleCourse("c_mod_preserve", "CS 250: Web Engineering");

      const updated = getLocalCustomModules()[0];
      expect(updated.course).toBe("CS 250: Web Engineering");
      expect(updated.moduleType).toBe("exam");
      expect(updated.config.examConfig?.totalDurationMinutes).toBe(45);
      expect(updated.questions.length).toBe(1);
      expect(updated.questions[0].prompt).toBe("Test question for Full Stack Dev");
      expect(updated.questions[0].correctOptionIds).toEqual(["opt_1"]);
    });

    it("returns false gracefully when updating a non-existent moduleId", () => {
      saveLocalCustomModule(createModuleWithCourse("c_mod_exists", "Algorithms", "CS 201"));

      const result = updateLocalCustomModuleCourse("non_existent_id", "CS 999");
      expect(result).toBe(false);
    });
  });

  /* =========================================================================
     2. Batch "Move to Course" Execution
     ========================================================================= */
  describe("2. Batch Move to Course Execution", () => {
    it("updates course for all selected custom modules atomically", () => {
      const m1 = createModuleWithCourse("move_1", "Module 1", "CS 101");
      const m2 = createModuleWithCourse("move_2", "Module 2", "MATH 101");
      const m3 = createModuleWithCourse("move_3", "Module 3", "BIO 101");

      saveLocalCustomModule(m1);
      saveLocalCustomModule(m2);
      saveLocalCustomModule(m3);

      const targetCourse = "ENG 400: Senior Capstone";
      const count = updateLocalCustomModulesCourse(["move_1", "move_3"], targetCourse);

      expect(count).toBe(2);

      const stored = getLocalCustomModules();
      expect(stored.find((m) => m.moduleId === "move_1")?.course).toBe(targetCourse);
      expect(stored.find((m) => m.moduleId === "move_3")?.course).toBe(targetCourse);
      expect(stored.find((m) => m.moduleId === "move_2")?.course).toBe("MATH 101");
    });

    it("returns 0 when batch moving empty array or non-existent IDs", () => {
      saveLocalCustomModule(createModuleWithCourse("m_stay", "Stay", "CS 101"));

      expect(updateLocalCustomModulesCourse([], "CS 202")).toBe(0);
      expect(updateLocalCustomModulesCourse(["ghost_id"], "CS 202")).toBe(0);
    });

    it("executes batch move via LibraryManageEngine and clears active selection", () => {
      const m1 = createModuleWithCourse("eng_m1", "Engine M1", "Course A");
      const m2 = createModuleWithCourse("eng_m2", "Engine M2", "Course B");

      saveLocalCustomModule(m1);
      saveLocalCustomModule(m2);

      const engine = new LibraryManageEngine();
      engine.toggleManageMode();
      engine.toggleSelect("eng_m1");
      engine.toggleSelect("eng_m2");
      expect(engine.getSelectionCount()).toBe(2);

      // Verify batch move update
      const updatedCount = updateLocalCustomModulesCourse(Array.from(engine.selectedIds), "Course Target");
      expect(updatedCount).toBe(2);
      engine.deselectAll();
      expect(engine.getSelectionCount()).toBe(0);

      const stored = getLocalCustomModules();
      expect(stored.every((m) => m.course === "Course Target")).toBe(true);
    });
  });

  /* =========================================================================
     3. Dynamic Course Extraction & Tab Bar Generation
     ========================================================================= */
  describe("3. Dynamic Course Extraction & Tab Bar", () => {
    it("extracts unique course tabs with total 'All Courses' count", () => {
      const library: PrepPulseModule[] = [
        createModuleWithCourse("m1", "M1", "CS 401: Deep Learning"),
        createModuleWithCourse("m2", "M2", "CS 401: Deep Learning"),
        createModuleWithCourse("m3", "M3", "BIO 101: Cell Biology"),
        createModuleWithCourse("m4", "M4", "MATH 220: Linear Algebra"),
      ];

      const tabs = extractCourseTabs(library);
      expect(tabs.length).toBe(4); // ALL + CS 401 + BIO 101 + MATH 220

      // First tab is always ALL
      expect(tabs[0].id).toBe("ALL");
      expect(tabs[0].label).toBe("All Courses");
      expect(tabs[0].count).toBe(4);

      const csTab = tabs.find((t) => t.id === "CS 401: Deep Learning");
      expect(csTab).toBeDefined();
      expect(csTab?.count).toBe(2);

      const bioTab = tabs.find((t) => t.id === "BIO 101: Cell Biology");
      expect(bioTab?.count).toBe(1);
    });

    it("correctly identifies unassigned modules under 'Unassigned' tab", () => {
      const library: PrepPulseModule[] = [
        createModuleWithCourse("m_assigned", "Assigned", "PHYS 101"),
        createModuleWithCourse("m_unassigned_1", "Unassigned 1", undefined),
        createModuleWithCourse("m_unassigned_2", "Unassigned 2", "   "),
      ];

      const tabs = extractCourseTabs(library);
      const unassignedTab = tabs.find((t) => t.id === "Unassigned");

      expect(unassignedTab).toBeDefined();
      expect(unassignedTab?.count).toBe(2);
    });

    it("dynamically updates tab list when a new module with a new course is added", () => {
      const initialLibrary = [createModuleWithCourse("m1", "M1", "CS 101")];
      const initialTabs = extractCourseTabs(initialLibrary);
      expect(initialTabs.length).toBe(2); // ALL + CS 101

      const updatedLibrary = [...initialLibrary, createModuleWithCourse("m2", "M2", "CHEM 101")];
      const updatedTabs = extractCourseTabs(updatedLibrary);
      expect(updatedTabs.length).toBe(3); // ALL + CS 101 + CHEM 101
      expect(updatedTabs.some((t) => t.id === "CHEM 101")).toBe(true);
    });
  });

  /* =========================================================================
     4. Course-Based Module Filtering
     ========================================================================= */
  describe("4. Course-Based Module Filtering", () => {
    const testLibrary: PrepPulseModule[] = [
      createModuleWithCourse("t1", "Neural Networks", "CS 401: Deep Learning"),
      createModuleWithCourse("t2", "Transformers", "CS 401: Deep Learning"),
      createModuleWithCourse("t3", "Genetics", "BIO 101: Cell Biology"),
      createModuleWithCourse("t4", "Uncategorized Topic", undefined),
    ];

    it("returns all modules when filter is 'ALL'", () => {
      const result = filterModulesByCourse(testLibrary, "ALL");
      expect(result.length).toBe(4);
    });

    it("filters accurately for a specific course", () => {
      const result = filterModulesByCourse(testLibrary, "CS 401: Deep Learning");
      expect(result.length).toBe(2);
      expect(result.every((m) => m.course === "CS 401: Deep Learning")).toBe(true);
    });

    it("filters case-insensitively", () => {
      const result = filterModulesByCourse(testLibrary, "cs 401: deep learning");
      expect(result.length).toBe(2);
    });

    it("filters for 'Unassigned' modules", () => {
      const result = filterModulesByCourse(testLibrary, "Unassigned");
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Uncategorized Topic");
    });

    it("returns empty array when filtering for a course with zero matches", () => {
      const result = filterModulesByCourse(testLibrary, "PHYS 999: Quantum Mechanics");
      expect(result.length).toBe(0);
    });
  });

  /* =========================================================================
     5. Course-Grouped Accordion View & State Management
     ========================================================================= */
  describe("5. Course-Grouped Accordion Grouping & View Modes", () => {
    it("groups modules into keyed dictionary by course name", () => {
      const library: PrepPulseModule[] = [
        createModuleWithCourse("g1", "G1", "CS 401"),
        createModuleWithCourse("g2", "G2", "CS 401"),
        createModuleWithCourse("g3", "G3", "BIO 101"),
        createModuleWithCourse("g4", "G4", undefined),
      ];

      const grouped = groupModulesByCourse(library);
      expect(Object.keys(grouped).length).toBe(3);
      expect(grouped["CS 401"].length).toBe(2);
      expect(grouped["BIO 101"].length).toBe(1);
      expect(grouped["Unassigned"].length).toBe(1);
    });

    it("handles empty module list returning empty groups object without error", () => {
      const grouped = groupModulesByCourse([]);
      expect(Object.keys(grouped).length).toBe(0);
    });

    it("toggles accordion section collapse independently", () => {
      const engine = new LibraryManageEngine();
      expect(engine.collapsedAccordionCourses.size).toBe(0);

      // Collapse CS 401
      const isCollapsed = engine.toggleAccordion("CS 401");
      expect(isCollapsed).toBe(true);
      expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(true);
      expect(engine.collapsedAccordionCourses.has("BIO 101")).toBe(false);

      // Re-expand CS 401
      const isExpanded = !engine.toggleAccordion("CS 401");
      expect(isExpanded).toBe(true);
      expect(engine.collapsedAccordionCourses.has("CS 401")).toBe(false);
    });

    it("preserves view mode, manage mode, and selection state when switching between grid and accordion", () => {
      const engine = new LibraryManageEngine();
      engine.toggleManageMode();
      engine.toggleSelect("mod_alpha");
      engine.toggleSelect("mod_beta");

      expect(engine.viewMode).toBe("grid");
      expect(engine.getSelectionCount()).toBe(2);

      // Switch to accordion
      engine.setViewMode("accordion");
      expect(engine.viewMode).toBe("accordion");
      expect(engine.isManageMode).toBe(true);
      expect(engine.getSelectionCount()).toBe(2);
      expect(engine.selectedIds.has("mod_alpha")).toBe(true);

      // Switch back to grid
      engine.setViewMode("grid");
      expect(engine.viewMode).toBe("grid");
      expect(engine.getSelectionCount()).toBe(2);
    });
  });
});
