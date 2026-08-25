import { Question } from "@/types";

/**
 * Modern Fisher-Yates (Knuth) array shuffle algorithm.
 * Guarantees uniform permutation distribution O(n) with zero mutation of the source array.
 *
 * @param array - Source array (immutable or mutable)
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: readonly T[] | T[]): T[] {
  if (!array || array.length <= 1) {
    return array ? [...array] : [];
  }

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Generate uniform random index in range [0, i]
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * Shuffles the options array of a single question without mutating the original question.
 *
 * @param question - The source question
 * @returns A new Question object with shuffled options
 */
export function shuffleQuestionOptions(question: Question): Question {
  if (!question || !question.options) {
    return question;
  }

  return {
    ...question,
    options: shuffleArray(question.options),
  };
}

/**
 * Groups questions by their checkpoint tier (1, 2, 3, etc.).
 *
 * @param questions - Array of questions
 * @returns Map of checkpoint number to questions array
 */
export function groupQuestionsByCheckpoint(
  questions: readonly Question[]
): Map<number, Question[]> {
  const groups = new Map<number, Question[]>();

  for (const q of questions) {
    const cp = q.checkpoint || 1;
    if (!groups.has(cp)) {
      groups.set(cp, []);
    }
    groups.get(cp)!.push(q);
  }

  return groups;
}

/**
 * Shuffles a single checkpoint tier's questions and optionally their options.
 *
 * @param tierQuestions - Questions within the specific checkpoint tier
 * @param shuffleOptions - Whether to shuffle options inside each question
 * @returns Shuffled tier questions
 */
export function shuffleCheckpointTier(
  tierQuestions: readonly Question[],
  shuffleOptions = true
): Question[] {
  const shuffledQuestions = shuffleArray(tierQuestions);
  if (!shuffleOptions) {
    return shuffledQuestions;
  }
  return shuffledQuestions.map((q) => shuffleQuestionOptions(q));
}

/**
 * Configuration options for question shuffling
 */
export interface ShuffleQuizOptions {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  preserveCheckpoints?: boolean;
}

/**
 * Shuffles a full question set for a quiz or exam module.
 * When `preserveCheckpoints` is true, questions are shuffled within their respective
 * checkpoint tiers, and tiers are ordered sequentially (Checkpoint 1, Checkpoint 2, etc.).
 *
 * @param questions - Full question set
 * @param options - Shuffle options
 * @returns Shuffled array of questions
 */
export function shuffleQuizQuestions(
  questions: readonly Question[],
  options: ShuffleQuizOptions = {}
): Question[] {
  const {
    shuffleQuestions = true,
    shuffleOptions = true,
    preserveCheckpoints = true,
  } = options;

  if (!questions || questions.length === 0) {
    return [];
  }

  // If preserving checkpoint tiers
  if (preserveCheckpoints) {
    const grouped = groupQuestionsByCheckpoint(questions);
    const sortedCheckpoints = Array.from(grouped.keys()).sort((a, b) => a - b);
    const result: Question[] = [];

    for (const cp of sortedCheckpoints) {
      const tierQuestions = grouped.get(cp) || [];
      const processedTier = shuffleQuestions
        ? shuffleArray(tierQuestions)
        : [...tierQuestions];

      for (const q of processedTier) {
        result.push(shuffleOptions ? shuffleQuestionOptions(q) : { ...q });
      }
    }

    return result;
  }

  // Full random shuffle across all questions
  const shuffled = shuffleQuestions
    ? shuffleArray(questions)
    : [...questions];

  return shuffled.map((q) =>
    shuffleOptions ? shuffleQuestionOptions(q) : { ...q }
  );
}
