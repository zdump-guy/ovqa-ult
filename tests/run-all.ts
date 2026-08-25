/**
 * Master E2E & Unit Test Runner Entrypoint
 * Loads all Tier 1, Tier 2, Tier 3, Tier 4, and Tier 5 test suites for PrepPulse Enhancements (R1-R4)
 * and executes them with rich summary reporting.
 */
import { registry } from "./harness/test-runner.ts";

// Tier 1: Feature Coverage Suites
import "./e2e/tier1_feature_coverage/r1_json_import_validator.test.ts";
import "./e2e/tier1_feature_coverage/r2_module_deletion_management.test.ts";
import "./e2e/tier1_feature_coverage/r3_course_categorization_grouping.test.ts";
import "./e2e/tier1_feature_coverage/r1_module_schema.test.ts";
import "./e2e/tier1_feature_coverage/r2_quiz_checkpoint.test.ts";
import "./e2e/tier1_feature_coverage/r3_exam_simulator.test.ts";
import "./e2e/tier1_feature_coverage/r4_diagnostic_report.test.ts";
import "./e2e/tier1_feature_coverage/r5_database_auth_rls.test.ts";

// Tier 2: Boundary & Corner Suites
import "./e2e/tier2_boundary_corner/r1_json_validator_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r2_deletion_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r3_course_grouping_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r1_schema_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r2_quiz_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r3_exam_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r4_diagnostic_boundaries.test.ts";
import "./e2e/tier2_boundary_corner/r5_security_boundaries.test.ts";

// Tier 3: Cross-Feature Pairwise Suites
import "./e2e/tier3_cross_feature/cross_feature_combinations.test.ts";
import "./e2e/tier3_cross_feature/integration_pipeline.test.ts";

// Tier 4: Real-World Workflow Suites
import "./e2e/tier4_real_world/real_world_scenarios.test.ts";

// Tier 5: Adversarial Hardening Suites
import "./e2e/tier5_adversarial/adversarial_hardening.test.ts";

async function main() {
  const results = await registry.runAll();
  if (results.failed > 0) {
    console.error(`\x1b[31mTest Run Completed with ${results.failed} failure(s).\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mAll ${results.total} tests across Tiers 1-5 passed successfully!\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
