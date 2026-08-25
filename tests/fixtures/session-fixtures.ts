/**
 * PrepPulse Test Fixtures - Session and User Fixtures
 */
export const MOCK_USER_A = {
  id: "usr_alice_123e4567-e89b-12d3-a456-426614174000",
  email: "alice@university.edu",
  full_name: "Alice Cooper",
};

export const MOCK_USER_B = {
  id: "usr_bob_987e6543-e21b-34c5-b678-987654321000",
  email: "bob@university.edu",
  full_name: "Bob Dylan",
};

export const PERFECT_QUIZ_ANSWERS: Record<string, string[]> = {
  q_001: ["opt_a"],
  q_002: ["opt_b"],
  q_003: ["opt_true"],
  q_004: ["opt_b"],
  q_005: ["opt_b"],
  q_006: ["opt_d"],
  q_007: ["opt_a", "opt_b", "opt_d"],
  q_008: ["opt_b"],
  q_009: ["opt_false"],
  q_010: ["opt_b"],
};

export const FAILING_CHECKPOINT_ANSWERS: Record<string, string[]> = {
  q_001: ["opt_a"], // correct
  q_002: ["opt_c"], // wrong
  q_003: ["opt_false"], // wrong
  q_004: ["opt_a"], // wrong
  q_005: ["opt_b"], // correct (2/5 correct = 40% < 80%)
};

export const TIME_TRAP_DISTRIBUTION: Record<string, number> = {
  q_001: 5, // correct, fast
  q_002: 60, // wrong, long time (avg ~15s, 60s > 2*15 -> TIME TRAP)
  q_003: 2, // wrong, very short (avg ~15s, 2s < 0.5*15 -> RUSHED ERROR)
  q_004: 15, // wrong, normal time
  q_005: 14, // correct, normal time
};
