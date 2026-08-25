import { PrepPulseModule } from "@/types";

/**
 * Generates a targeted Smart Retry remediation module containing only the questions
 * that the user missed during their quiz or mock exam attempt.
 *
 * @param originalModule The original source module
 * @param missedQuestionIds Array of question IDs that were answered incorrectly
 * @returns A new playable PrepPulseModule configured for rapid checkpoint quiz practice
 */
export function generateSmartRetryModule(
  originalModule: PrepPulseModule,
  missedQuestionIds: string[]
): PrepPulseModule {
  const missedSet = new Set(missedQuestionIds);
  const filteredQuestions = originalModule.questions.filter((q) => missedSet.has(q.id));

  // If no questions were missed (100% score), preserve empty array or fallback to all questions
  const reindexedQuestions = filteredQuestions.map((q, idx) => ({
    ...q,
    checkpoint: Math.floor(idx / 5) + 1,
  }));

  const checkpointInterval = Math.min(5, Math.max(1, filteredQuestions.length));

  return {
    moduleId: `retry_${originalModule.moduleId || "mod"}_${Date.now()}`,
    title: `Smart Retry: ${originalModule.title} (Weak Spots)`,
    description: `Targeted remediation quiz focusing on ${filteredQuestions.length} previously missed questions.`,
    moduleType: "quiz",
    targetSubject: originalModule.targetSubject,
    createdAt: new Date().toISOString(),
    config: {
      quizConfig: {
        checkpointInterval,
        timePerQuestionSeconds: 15,
        checkpointPassThreshold: 0.8,
        enableStreakBonus: true,
      },
    },
    questions: reindexedQuestions,
  };
}
