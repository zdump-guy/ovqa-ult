/**
 * Tier 1: Feature Coverage - R5. Database Schema, Auth & Supabase RLS
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { MockSupabaseEngine } from "../../harness/mock-state.ts";
import { MOCK_USER_A, MOCK_USER_B } from "../../fixtures/session-fixtures.ts";

describe("R5. Database Schema, Auth & Supabase RLS Isolation", () => {
  it("T1.5.1: Tenant Isolation: User A cannot query or read private modules belonging to User B", () => {
    const db = new MockSupabaseEngine();
    db.createProfile(MOCK_USER_A);
    db.createProfile(MOCK_USER_B);

    db.insertModule(MOCK_USER_A.id, {
      id: "mod_alice_001",
      user_id: MOCK_USER_A.id,
      title: "Alice Private Study Guide",
      description: "Confidential course materials",
      module_type: "quiz",
      subject: "Computer Science",
      config: {},
      raw_json: {},
      is_public: false,
    });

    const bobModules = db.queryModules(MOCK_USER_B.id);
    expect(bobModules).toHaveLength(0);

    const aliceModules = db.queryModules(MOCK_USER_A.id);
    expect(aliceModules).toHaveLength(1);
    expect(aliceModules[0].id).toBe("mod_alice_001");
  });

  it("T1.5.2: Public / Demo Modules are readable by guests without authentication", () => {
    const db = new MockSupabaseEngine();

    db.modules.set("mod_demo_public", {
      id: "mod_demo_public",
      user_id: "system_admin",
      title: "Public Machine Learning Demo",
      description: "Accessible to all students",
      module_type: "quiz",
      subject: "AI",
      config: {},
      raw_json: {},
      is_public: true,
    });

    const guestModules = db.queryModules(null);
    expect(guestModules).toHaveLength(1);
    expect(guestModules[0].id).toBe("mod_demo_public");
  });

  it("T1.5.3: Question Access Isolation: RLS prevents querying questions of private modules without permission", () => {
    const db = new MockSupabaseEngine();
    db.insertModule(MOCK_USER_A.id, {
      id: "mod_alice_private",
      user_id: MOCK_USER_A.id,
      title: "Private",
      description: "Private",
      module_type: "quiz",
      subject: "CS",
      config: {},
      raw_json: {},
      is_public: false,
    });

    db.questions.set("q_alice_1", {
      id: "q_alice_1",
      module_id: "mod_alice_private",
      checkpoint_tier: 1,
      question_type: "multiple_choice",
      difficulty: "easy",
      prompt: "Secret Question",
      options: [],
      correct_option_ids: [],
      explanation: "",
    });

    const bobQuestions = db.queryQuestions(MOCK_USER_B.id, "mod_alice_private");
    expect(bobQuestions).toHaveLength(0);

    const aliceQuestions = db.queryQuestions(MOCK_USER_A.id, "mod_alice_private");
    expect(aliceQuestions).toHaveLength(1);
    expect(aliceQuestions[0].id).toBe("q_alice_1");
  });

  it("T1.5.4: Test Session Isolation: Users cannot inspect or mutate other users' test session logs", () => {
    const db = new MockSupabaseEngine();

    db.insertTestSession(MOCK_USER_A.id, {
      id: "sess_alice_001",
      user_id: MOCK_USER_A.id,
      module_id: "mod_demo_public",
      session_type: "quiz",
      status: "completed",
      total_questions: 10,
      correct_answers: 9,
      score_percentage: 90,
      time_spent_seconds: 120,
      checkpoint_reached: 2,
      breakdown: {},
    });

    const bobSessions = db.queryTestSessions(MOCK_USER_B.id);
    expect(bobSessions).toHaveLength(0);

    expect(() =>
      db.insertTestSession(MOCK_USER_B.id, {
        id: "sess_malicious",
        user_id: MOCK_USER_A.id,
        module_id: "mod_demo_public",
        session_type: "quiz",
        status: "completed",
        total_questions: 10,
        correct_answers: 0,
        score_percentage: 0,
        time_spent_seconds: 10,
        checkpoint_reached: 1,
        breakdown: {},
      })
    ).toThrow("Tenant isolation violation");
  });

  it("T1.5.5: Cascading deletion: Deleting a module deletes all its associated questions and sessions", () => {
    const db = new MockSupabaseEngine();
    db.insertModule(MOCK_USER_A.id, {
      id: "mod_to_delete",
      user_id: MOCK_USER_A.id,
      title: "Temporary Module",
      description: "To be deleted",
      module_type: "quiz",
      subject: "CS",
      config: {},
      raw_json: {},
    });

    db.questions.set("q_del_1", {
      id: "q_del_1",
      module_id: "mod_to_delete",
      checkpoint_tier: 1,
      question_type: "multiple_choice",
      difficulty: "easy",
      prompt: "Q1",
      options: [],
      correct_option_ids: [],
      explanation: "",
    });

    db.insertTestSession(MOCK_USER_A.id, {
      id: "sess_del_1",
      user_id: MOCK_USER_A.id,
      module_id: "mod_to_delete",
      session_type: "quiz",
      status: "completed",
      total_questions: 1,
      correct_answers: 1,
      score_percentage: 100,
      time_spent_seconds: 10,
      checkpoint_reached: 1,
      breakdown: {},
    });

    const deleted = db.deleteModule(MOCK_USER_A.id, "mod_to_delete");
    expect(deleted).toBe(true);

    expect(db.modules.has("mod_to_delete")).toBe(false);
    expect(db.questions.has("q_del_1")).toBe(false);
    expect(db.testSessions.has("sess_del_1")).toBe(false);
  });

  it("T1.5.6: Unauthenticated write attempts are rejected with RLS authorization error", () => {
    const db = new MockSupabaseEngine();
    expect(() =>
      db.insertModule(null, {
        id: "mod_unauth",
        user_id: "fake_user",
        title: "Unauth Module",
        description: "Should fail",
        module_type: "quiz",
        subject: "CS",
        config: {},
        raw_json: {},
      })
    ).toThrow("Unauthenticated user cannot create private modules");
  });
}, "Tier 1", "R5: Database Schema, Auth & RLS");
