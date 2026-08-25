/**
 * Deterministic Mock Module Generator
 * Produces schema-valid PrepPulse modules matching ModuleZodSchema for offline development,
 * CI/CD testing, and fallback when Google Gemini API keys are unconfigured.
 */

import { PrepPulseModule, Question, QuestionOption, QuizConfig, ExamConfig } from "@/types";
import { ModuleZodSchema } from "@/lib/schema";

export interface MockGeneratorOptions {
  extractedText?: string;
  moduleType?: "quiz" | "exam";
  requestedCount?: number;
  subject?: string;
  title?: string;
  config?: {
    quizConfig?: Partial<QuizConfig>;
    examConfig?: Partial<ExamConfig>;
  };
}

interface ConceptSnippet {
  topic: string;
  statement: string;
  keywords: string[];
}

/**
 * Extracts key conceptual statements from raw syllabus or course notes text.
 */
function extractConceptsFromText(text: string): ConceptSnippet[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const lines = text
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.startsWith("#") && !l.toLowerCase().startsWith("course:"));

  const concepts: ConceptSnippet[] = [];
  let currentTopic = "General Concepts";

  for (const line of lines) {
    if (line.toLowerCase().startsWith("topic") || line.toLowerCase().startsWith("module") || line.toLowerCase().startsWith("chapter")) {
      const parts = line.split(":");
      currentTopic = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      continue;
    }

    const words = line.split(/\s+/).filter((w) => w.length > 4);
    concepts.push({
      topic: currentTopic,
      statement: line,
      keywords: words.slice(0, 5),
    });
  }

  return concepts;
}

/**
 * Fallback knowledge bank for generating rich, diverse domain questions.
 */
const DOMAIN_KNOWLEDGE_POOL = [
  {
    topic: "Neural Architectures",
    subject: "Deep Learning & Neural Networks",
    fact: "Residual skip connections add identity mappings F(x) + x to prevent gradient vanishing.",
    distractors: [
      "Replacing activation functions with linear approximations",
      "Exponentially increasing the weight decay penalty per layer",
      "Eliminating normalization layers across deep subgraphs",
    ],
    trueFalse: {
      prompt: "Residual connections introduce identity shortcuts that allow unimpeded backpropagation of gradients.",
      isTrue: true,
      explanation: "Skip connections bypass non-linear transformations, enabling gradients to reach earlier layers without decay.",
    },
    multiSelect: {
      prompt: "Which of the following are primary advantages of Residual Networks (ResNet)?",
      options: [
        { id: "opt_a", text: "Mitigates vanishing gradients in very deep networks" },
        { id: "opt_b", text: "Enables training of models with over 100 layers" },
        { id: "opt_c", text: "Guarantees zero inference latency on edge devices" },
        { id: "opt_d", text: "Allows identity mapping when additional layers are redundant" },
      ],
      correct: ["opt_a", "opt_b", "opt_d"],
      explanation: "ResNets ease optimization of deep networks through identity mappings, but do not guarantee zero inference latency.",
    },
  },
  {
    topic: "Optimization & Learning",
    subject: "Machine Learning",
    fact: "Adam computes adaptive individual learning rates using exponentially decaying first and second gradient moments.",
    distractors: [
      "Fixed step sizes based purely on batch size",
      "Random walk annealing with zero momentum",
      "Gradient descent without moment tracking",
    ],
    trueFalse: {
      prompt: "Adam optimizer combines first-order momentum with second-order squared gradient moment estimates.",
      isTrue: true,
      explanation: "Adam calculates exponentially decaying averages of past gradients (momentum) and past squared gradients (scale).",
    },
    multiSelect: {
      prompt: "Which hyperparameters are directly configured in the standard Adam optimizer?",
      options: [
        { id: "opt_a", text: "Learning rate alpha" },
        { id: "opt_b", text: "Beta 1 (first moment decay rate)" },
        { id: "opt_c", text: "Beta 2 (second moment decay rate)" },
        { id: "opt_d", text: "Epsilon for numerical stability" },
      ],
      correct: ["opt_a", "opt_b", "opt_c", "opt_d"],
      explanation: "Standard Adam requires alpha, beta1 (typically 0.9), beta2 (typically 0.999), and epsilon (1e-8).",
    },
  },
  {
    topic: "Regularization & Generalization",
    subject: "Machine Learning",
    fact: "Dropout randomly zeroes out activations during training to discourage co-adaptation and must be disabled at test time.",
    distractors: [
      "Dropout zeroes activations permanently during both training and inference",
      "Dropout adds L1 norm penalties to the loss objective",
      "Dropout doubles the learning rate for dead neurons",
    ],
    trueFalse: {
      prompt: "Dropout should be active with the same probability during inference/testing time.",
      isTrue: false,
      explanation: "At test time, all neurons are kept active and activations are scaled (or inverted dropout is used) to maintain deterministic evaluation.",
    },
    multiSelect: {
      prompt: "Which techniques are commonly used to mitigate overfitting in deep learning models?",
      options: [
        { id: "opt_a", text: "Early stopping on validation loss" },
        { id: "opt_b", text: "L2 weight decay regularization" },
        { id: "opt_c", text: "Data augmentation on training inputs" },
        { id: "opt_d", text: "Training until training loss reaches exactly zero without validation checks" },
      ],
      correct: ["opt_a", "opt_b", "opt_c"],
      explanation: "Early stopping, weight decay, and data augmentation prevent overfitting. Overfitting occurs when training loss is pushed to zero without validation.",
    },
  },
  {
    topic: "Distributed Consensus",
    subject: "Distributed Systems",
    fact: "Raft consensus utilizes randomized election timeouts to prevent split-vote deadlock during leader election.",
    distractors: [
      "Static round-robin token rings with central coordinators",
      "Two-phase locking across all replica disks",
      "Unsynchronized clock synchronization algorithms",
    ],
    trueFalse: {
      prompt: "Two-Phase Commit (2PC) is a non-blocking atomic consensus protocol that tolerates coordinator failure.",
      isTrue: false,
      explanation: "2PC is a blocking protocol. If the coordinator crashes during the prepare phase, participants remain blocked.",
    },
    multiSelect: {
      prompt: "Which properties are core features of the Raft consensus algorithm?",
      options: [
        { id: "opt_a", text: "Strong leader paradigm with log flow from leader to followers" },
        { id: "opt_b", text: "Randomized election timeouts to resolve split votes" },
        { id: "opt_c", text: "Leader election requires majority quorum agreement" },
        { id: "opt_d", text: "Allows simultaneous writes from multiple uncoordinated leaders" },
      ],
      correct: ["opt_a", "opt_b", "opt_c"],
      explanation: "Raft enforces a single leader at any term backed by majority quorum, rejecting multi-leader uncoordinated writes.",
    },
  },
  {
    topic: "Partitioning & CAP Theorem",
    subject: "Distributed Systems",
    fact: "Consistent hashing using virtual nodes minimizes key redistribution and prevents hotspotting across server nodes.",
    distractors: [
      "Linear hash mapping with modulo number of servers (hash(k) % N)",
      "Single centralized lookup table broadcast on every write",
      "Random replication with broadcast gossiping",
    ],
    trueFalse: {
      prompt: "According to the CAP theorem, a distributed system can guarantee Consistency, Availability, and Partition Tolerance simultaneously during a network partition.",
      isTrue: false,
      explanation: "In the presence of network partitions (P), a distributed system must choose between strong Consistency (CP) or high Availability (AP).",
    },
    multiSelect: {
      prompt: "What benefits are provided by consistent hashing with virtual nodes?",
      options: [
        { id: "opt_a", text: "Only k/N keys need remapping when a node joins or leaves" },
        { id: "opt_b", text: "Virtual nodes achieve uniform key load distribution" },
        { id: "opt_c", text: "Guarantees zero network latency across all regions" },
        { id: "opt_d", text: "Accommodates heterogeneous server capacities" },
      ],
      correct: ["opt_a", "opt_b", "opt_d"],
      explanation: "Consistent hashing bounds remapping, balances load, and handles server capacity differences, but does not eliminate physical network latency.",
    },
  },
  {
    topic: "Transformers & Attention",
    subject: "Natural Language Processing",
    fact: "Standard Multi-Head Self-Attention scales quadratically O(N^2) with respect to input sequence length N.",
    distractors: [
      "Scales with logarithmic complexity O(log N)",
      "Scales strictly linearly O(N) in memory and compute",
      "Scales exponentially O(2^N) due to recurrences",
    ],
    trueFalse: {
      prompt: "Self-attention enables tokens to attend to all other tokens in parallel without sequential recurrent steps.",
      isTrue: true,
      explanation: "Transformers replace sequential recurrent dependencies with parallel matrix multiplications over Queries, Keys, and Values.",
    },
    multiSelect: {
      prompt: "Which components are present in a standard Transformer encoder layer?",
      options: [
        { id: "opt_a", text: "Multi-Head Self-Attention mechanism" },
        { id: "opt_b", text: "Residual connections and Layer Normalization" },
        { id: "opt_c", text: "Position-wise Feed-Forward Network (FFN)" },
        { id: "opt_d", text: "Bidirectional LSTM recurrent cell" },
      ],
      correct: ["opt_a", "opt_b", "opt_c"],
      explanation: "Standard Transformer encoders use self-attention, residual normalization, and position-wise FFNs without recurrent LSTM units.",
    },
  },
];

/**
 * Deterministically generates a schema-compliant PrepPulseModule.
 */
export function generateMockModule(options: MockGeneratorOptions = {}): PrepPulseModule {
  const moduleType = options.moduleType || "quiz";
  const requestedCount = Math.max(1, Math.min(options.requestedCount || (moduleType === "quiz" ? 15 : 25), 100));

  const textConcepts = extractConceptsFromText(options.extractedText || "");
  const subject =
    options.subject ||
    (options.extractedText?.includes("CS 401") || options.extractedText?.includes("Neural")
      ? "Artificial Intelligence & Deep Learning"
      : options.extractedText?.includes("CS 501") || options.extractedText?.includes("Distributed")
      ? "Distributed Systems & Cloud Architecture"
      : "Computer Science & Engineering");

  const title =
    options.title ||
    `Generated: ${subject} (${moduleType === "quiz" ? "Checkpoint Speed Run" : "Comprehensive Mock Exam"})`;

  const description =
    options.extractedText && options.extractedText.length > 50
      ? `Auto-generated ${moduleType} module derived from uploaded course materials and syllabus text.`
      : `High-yield ${moduleType} preparation module targeting core exam competencies and problem-solving.`;

  const checkpointInterval = options.config?.quizConfig?.checkpointInterval || 5;

  const questions: Question[] = [];

  for (let i = 0; i < requestedCount; i++) {
    const qIndex = i + 1;
    const checkpoint = moduleType === "quiz" ? Math.floor(i / checkpointInterval) + 1 : 1;
    const qId = `q_mock_${String(qIndex).padStart(3, "0")}`;

    // Cycle through concepts and domain pool
    const domainItem = DOMAIN_KNOWLEDGE_POOL[i % DOMAIN_KNOWLEDGE_POOL.length];
    const textItem = textConcepts.length > 0 ? textConcepts[i % textConcepts.length] : null;

    // Determine question type (mix of multiple_choice, multi_select, true_false)
    const typeMod = i % 5;
    let questionType: Question["type"] = "multiple_choice";
    if (typeMod === 2) {
      questionType = "true_false";
    } else if (typeMod === 4) {
      questionType = "multi_select";
    }

    // Determine difficulty (easy, medium, hard)
    const diffMod = i % 4;
    const difficulty: Question["difficulty"] = diffMod === 0 ? "easy" : diffMod === 3 ? "hard" : "medium";

    let prompt = "";
    let optionsList: QuestionOption[] = [];
    let correctOptionIds: string[] = [];
    let explanation = "";
    const sourceRef = textItem
      ? `Syllabus reference: ${textItem.topic}`
      : `${domainItem.subject} (Section ${checkpoint})`;

    if (questionType === "true_false") {
      const tfData = domainItem.trueFalse;
      prompt = textItem
        ? `True or False: ${textItem.statement}`
        : tfData.prompt;

      optionsList = [
        { id: "opt_t", text: "True" },
        { id: "opt_f", text: "False" },
      ];

      // If based on text, statement is True; otherwise use domain data
      const isTrue = textItem ? true : tfData.isTrue;
      correctOptionIds = isTrue ? ["opt_t"] : ["opt_f"];
      explanation = textItem
        ? `The statement is directly stated in the course text: "${textItem.statement}".`
        : tfData.explanation;
    } else if (questionType === "multi_select") {
      const msData = domainItem.multiSelect;
      prompt = msData.prompt;
      optionsList = msData.options;
      correctOptionIds = msData.correct;
      explanation = msData.explanation;
    } else {
      // Multiple Choice
      if (textItem) {
        prompt = `According to the syllabus topic on "${textItem.topic}", which of the following is accurate?`;
        optionsList = [
          { id: "opt_a", text: textItem.statement },
          { id: "opt_b", text: `Inverting the behavior described in ${textItem.topic} to reduce accuracy` },
          { id: "opt_c", text: `Deprecating ${textItem.topic} due to excessive memory overhead` },
          { id: "opt_d", text: `Treating ${textItem.topic} as a non-deterministic random heuristic` },
        ];
        correctOptionIds = ["opt_a"];
        explanation = `The correct answer directly aligns with the syllabus concept: "${textItem.statement}".`;
      } else {
        prompt = `What is the core principle or mechanism behind ${domainItem.topic}?`;
        optionsList = [
          { id: "opt_a", text: domainItem.fact },
          { id: "opt_b", text: domainItem.distractors[0] },
          { id: "opt_c", text: domainItem.distractors[1] },
          { id: "opt_d", text: domainItem.distractors[2] },
        ];
        correctOptionIds = ["opt_a"];
        explanation = `${domainItem.fact} This represents the verified standard definition.`;
      }
    }

    questions.push({
      id: qId,
      type: questionType,
      checkpoint,
      difficulty,
      prompt,
      options: optionsList,
      correctOptionIds,
      explanation,
      sourceReference: sourceRef,
    });
  }

  const moduleConfig =
    moduleType === "quiz"
      ? {
          quizConfig: {
            checkpointInterval: checkpointInterval,
            timePerQuestionSeconds: options.config?.quizConfig?.timePerQuestionSeconds ?? 15,
            checkpointPassThreshold: options.config?.quizConfig?.checkpointPassThreshold ?? 0.8,
            enableStreakBonus: options.config?.quizConfig?.enableStreakBonus ?? true,
          },
        }
      : {
          examConfig: {
            totalDurationMinutes:
              options.config?.examConfig?.totalDurationMinutes ?? Math.max(15, Math.round(requestedCount * 2)),
            passingScorePercentage: options.config?.examConfig?.passingScorePercentage ?? 60,
            shuffleQuestions: options.config?.examConfig?.shuffleQuestions ?? true,
            shuffleOptions: options.config?.examConfig?.shuffleOptions ?? true,
            allowReview: options.config?.examConfig?.allowReview ?? true,
          },
        };

  const rawModule: PrepPulseModule = {
    moduleId: `mod_gen_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    description,
    moduleType,
    targetSubject: subject,
    createdAt: new Date().toISOString(),
    config: moduleConfig,
    questions,
  };

  // Validate output against Zod schema to ensure complete correctness
  return ModuleZodSchema.parse(rawModule);
}
