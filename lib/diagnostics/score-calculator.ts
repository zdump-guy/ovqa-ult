import {
  DiagnosticReport,
  PrepPulseModule,
  Question,
  QuestionReview,
  TopicMastery,
} from "@/types";

export interface CalculateReportParams {
  module: PrepPulseModule;
  questions: Question[];
  userAnswers: Record<string, string[]>;
  questionTimes: Record<string, number>;
  totalTimeSpentSeconds?: number;
  passThresholdPercentage?: number;
}

/**
 * Calculates a complete DiagnosticReport from a completed quiz or exam session.
 */
export function calculateDiagnosticReport(
  params: CalculateReportParams
): DiagnosticReport {
  const {
    module,
    questions,
    userAnswers,
    questionTimes,
  } = params;

  const totalQuestions = questions.length;
  let correctCount = 0;
  let computedTotalTime = 0;

  const questionReviews: QuestionReview[] = [];
  const missedQuestionIds: string[] = [];

  const difficultyStats = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  };

  const topicMap = new Map<string, { total: number; correct: number }>();

  // Process each question
  for (const q of questions) {
    const selected = userAnswers[q.id] || [];
    const timeSpent = questionTimes[q.id] || 0;
    computedTotalTime += timeSpent;

    const isCorrect =
      selected.length === q.correctOptionIds.length &&
      selected.length > 0 &&
      selected.every((id) => q.correctOptionIds.includes(id));

    if (isCorrect) {
      correctCount++;
    } else {
      missedQuestionIds.push(q.id);
    }

    // Difficulty tracking
    const diff = q.difficulty || "medium";
    if (diff in difficultyStats) {
      difficultyStats[diff].total++;
      if (isCorrect) difficultyStats[diff].correct++;
    }

    // Topic tracking (derived from q.topic or targetSubject)
    const topic = (q as { topic?: string }).topic || module.targetSubject || "General";
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { total: 0, correct: 0 });
    }
    const topicStat = topicMap.get(topic)!;
    topicStat.total++;
    if (isCorrect) topicStat.correct++;

    questionReviews.push({
      question: q,
      userSelectedOptionIds: selected,
      isCorrect,
      timeSpentSeconds: timeSpent,
      explanation: q.explanation,
      sourceReference: q.sourceReference,
    });
  }

  const scorePercentage =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const finalTotalTime = params.totalTimeSpentSeconds ?? computedTotalTime;
  const averagePaceSeconds =
    totalQuestions > 0 ? Math.round((finalTotalTime / totalQuestions) * 10) / 10 : 0;

  // Time velocity analysis
  const timeTraps: string[] = [];
  const rushedErrors: string[] = [];

  if (averagePaceSeconds > 0) {
    for (const review of questionReviews) {
      if (!review.isCorrect) {
        if (review.timeSpentSeconds > averagePaceSeconds * 2.0) {
          timeTraps.push(review.question.id);
        } else if (review.timeSpentSeconds < averagePaceSeconds * 0.5) {
          rushedErrors.push(review.question.id);
        }
      }
    }
  }

  // Determine pass threshold
  const effectiveThreshold =
    params.passThresholdPercentage !== undefined
      ? params.passThresholdPercentage
      : module.moduleType === "exam"
      ? (module.config.examConfig?.passingScorePercentage ?? 60)
      : (module.config.quizConfig?.checkpointPassThreshold ? Math.round(module.config.quizConfig.checkpointPassThreshold * 100) : 80);

  // Topic mastery compilation
  const topicMastery: TopicMastery[] = Array.from(topicMap.entries()).map(
    ([topic, stats]) => {
      const percentage =
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      let status: TopicMastery["status"] = "weak_spot";
      if (percentage >= 80) status = "mastered";
      else if (percentage >= 60) status = "competent";

      return {
        topic,
        total: stats.total,
        correct: stats.correct,
        percentage,
        status,
      };
    }
  );

  return {
    totalQuestions,
    correctCount,
    scorePercentage,
    passed: scorePercentage >= effectiveThreshold,
    totalTimeSpentSeconds: finalTotalTime,
    averagePaceSeconds,
    topicMastery,
    difficultyAccuracy: {
      easy: {
        total: difficultyStats.easy.total,
        correct: difficultyStats.easy.correct,
        percentage:
          difficultyStats.easy.total > 0
            ? Math.round(
                (difficultyStats.easy.correct / difficultyStats.easy.total) * 100
              )
            : 0,
      },
      medium: {
        total: difficultyStats.medium.total,
        correct: difficultyStats.medium.correct,
        percentage:
          difficultyStats.medium.total > 0
            ? Math.round(
                (difficultyStats.medium.correct /
                  difficultyStats.medium.total) *
                  100
              )
            : 0,
      },
      hard: {
        total: difficultyStats.hard.total,
        correct: difficultyStats.hard.correct,
        percentage:
          difficultyStats.hard.total > 0
            ? Math.round(
                (difficultyStats.hard.correct / difficultyStats.hard.total) * 100
              )
            : 0,
      },
    },
    timeTraps,
    rushedErrors,
    missedQuestionIds,
    questionReviews,
  };
}
