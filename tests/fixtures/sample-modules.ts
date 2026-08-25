/**
 * PrepPulse Test Fixtures - Canonical, Custom, and Edge Modules
 */
import type { PrepPulseModule } from "../harness/mock-state.ts";

export const SAMPLE_QUIZ_MODULE: PrepPulseModule = {
  moduleId: "mod_cs_ai_401_midterm",
  title: "Machine Learning & Neural Architectures",
  description: "Comprehensive prep module generated from Lecture 1-6 & 2025 Midterm",
  moduleType: "quiz",
  targetSubject: "Artificial Intelligence",
  course: "CS 401: Deep Learning",
  createdAt: "2026-08-24T12:00:00Z",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
      enableStreakBonus: true,
    },
  },
  questions: [
    // Checkpoint 1 (Q1-Q5)
    {
      id: "q_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is the primary vanishing gradient mitigation in ResNet architectures?",
      options: [
        { id: "opt_a", text: "Residual skip connections adding identity mappings" },
        { id: "opt_b", text: "Replacing ReLU with standard Sigmoid activations" },
        { id: "opt_c", text: "Increasing weight decay penalties linearly" },
        { id: "opt_d", text: "Removing batch normalization layers" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Residual skip connections allow gradients to flow directly through identity shortcuts.",
      topic: "Neural Architectures",
    },
    {
      id: "q_002",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Which activation function is most susceptible to the dying neuron problem?",
      options: [
        { id: "opt_a", text: "Leaky ReLU" },
        { id: "opt_b", text: "Standard ReLU" },
        { id: "opt_c", text: "ELU" },
        { id: "opt_d", text: "GELU" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Standard ReLU outputs zero for negative inputs, potentially causing permanently zero gradients.",
      topic: "Activation Functions",
    },
    {
      id: "q_003",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Batch Normalization normalizes activations across the mini-batch dimension during training.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation: "Batch normalization computes mean and variance over the current mini-batch to stabilize training.",
      topic: "Normalization",
    },
    {
      id: "q_004",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "What is the primary computational bottleneck in self-attention mechanism in standard Transformers?",
      options: [
        { id: "opt_a", text: "O(N) linear projection memory" },
        { id: "opt_b", text: "O(N^2) sequence length quadratic complexity" },
        { id: "opt_c", text: "O(d^3) feed-forward dimensionality" },
        { id: "opt_d", text: "Positional encoding calculations" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Computing the full QK^T matrix scales quadratically O(N^2) with respect to input sequence length N.",
      topic: "Transformers",
    },
    {
      id: "q_005",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "Dropout during inference should typically be:",
      options: [
        { id: "opt_a", text: "Enabled with double probability" },
        { id: "opt_b", text: "Disabled and weights scaled appropriately" },
        { id: "opt_c", text: "Randomized per test sample" },
        { id: "opt_d", text: "Applied only to output logits" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Dropout is disabled at inference time, utilizing the full network ensemble.",
      topic: "Regularization",
    },

    // Checkpoint 2 (Q6-Q10)
    {
      id: "q_006",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "medium",
      prompt: "Which optimizer incorporates both adaptive learning rates and exponential moving average of momentum?",
      options: [
        { id: "opt_a", text: "SGD" },
        { id: "opt_b", text: "AdaGrad" },
        { id: "opt_c", text: "RMSProp" },
        { id: "opt_d", text: "Adam" },
      ],
      correctOptionIds: ["opt_d"],
      explanation: "Adam combines first-order momentum with second-order squared gradient moment estimates.",
      topic: "Optimization",
    },
    {
      id: "q_007",
      type: "multi_select",
      checkpoint: 2,
      difficulty: "hard",
      prompt: "Which of the following techniques directly prevent overfitting in deep neural networks? (Select all)",
      options: [
        { id: "opt_a", text: "L2 Weight Regularization" },
        { id: "opt_b", text: "Early Stopping" },
        { id: "opt_c", text: "Removing Training Data" },
        { id: "opt_d", text: "Data Augmentation" },
      ],
      correctOptionIds: ["opt_a", "opt_b", "opt_d"],
      explanation: "L2 weight decay, early stopping, and data augmentation increase generalization and reduce overfitting.",
      topic: "Regularization",
    },
    {
      id: "q_008",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "medium",
      prompt: "What loss function is standard for multi-class classification with mutually exclusive categories?",
      options: [
        { id: "opt_a", text: "Mean Squared Error (MSE)" },
        { id: "opt_b", text: "Categorical Cross-Entropy" },
        { id: "opt_c", text: "Binary Cross-Entropy" },
        { id: "opt_d", text: "Hinge Loss" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Categorical cross-entropy combined with Softmax is the standard loss for multi-class classification.",
      topic: "Loss Functions",
    },
    {
      id: "q_009",
      type: "true_false",
      checkpoint: 2,
      difficulty: "easy",
      prompt: "Gradient Descent with momentum always converges to the global minimum in non-convex loss surfaces.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_false"],
      explanation: "Non-convex optimization can get stuck in sub-optimal local minima or saddle points.",
      topic: "Optimization",
    },
    {
      id: "q_010",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "hard",
      prompt: "In Layer Normalization, statistics (mean & variance) are calculated over:",
      options: [
        { id: "opt_a", text: "All samples in the mini-batch for each feature" },
        { id: "opt_b", text: "All hidden channels/features for a single sample" },
        { id: "opt_c", text: "A sliding temporal window across sequence steps" },
        { id: "opt_d", text: "The entire training dataset offline" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Layer Normalization computes statistics independently for each sample across its feature dimensions.",
      topic: "Normalization",
    },
  ],
};

export const SAMPLE_EXAM_MODULE: PrepPulseModule = {
  moduleId: "mod_cs_cloud_501_final",
  title: "Distributed Systems & Cloud Infrastructure Engineering",
  description: "Comprehensive 20-question final exam covering consensus, sharding, and resilience.",
  moduleType: "exam",
  targetSubject: "Distributed Systems",
  course: "CS 501: Distributed Systems",
  createdAt: "2026-08-24T12:00:00Z",
  config: {
    examConfig: {
      totalDurationMinutes: 45,
      passingScorePercentage: 60,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowReview: true,
    },
  },
  questions: [
    {
      id: "q_ex_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "In the Raft consensus algorithm, how is split-vote leader election resolved?",
      options: [
        { id: "opt_a", text: "Randomized election timeouts per candidate" },
        { id: "opt_b", text: "Priority based on smallest IP address" },
        { id: "opt_c", text: "Immediate failover to multi-leader mode" },
        { id: "opt_d", text: "Restarting all nodes synchronously" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Randomized election timeouts ensure candidates split votes rarely and elect a leader quickly.",
      topic: "Consensus Algorithms",
    },
    {
      id: "q_ex_002",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt: "Under the CAP theorem, what does a partition-tolerant system choose during a network partition?",
      options: [
        { id: "opt_a", text: "Both Consistency and Availability simultaneously" },
        { id: "opt_b", text: "Either Consistency (CP) or Availability (AP)" },
        { id: "opt_c", text: "Immediate node reboot" },
        { id: "opt_d", text: "Downgrading network speed to avoid dropped packets" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "When a partition occurs (P), a distributed system must trade off between returning consistent data or available data.",
      topic: "CAP Theorem",
    },
    {
      id: "q_ex_003",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "Consistent hashing with virtual nodes primarily solves which problem?",
      options: [
        { id: "opt_a", text: "Uneven data distribution / hotspotting among physical nodes" },
        { id: "opt_b", text: "Network latency between continents" },
        { id: "opt_c", text: "SQL query optimization" },
        { id: "opt_d", text: "TLS certificate rotation" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Virtual nodes spread each physical server across multiple points on the hash ring, preventing load hotspots.",
      topic: "Sharding & Partitioning",
    },
    {
      id: "q_ex_004",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Two-Phase Commit (2PC) is a non-blocking consensus protocol that tolerates coordinator crashes without stalling.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_false"],
      explanation: "2PC is a blocking protocol; if the coordinator crashes during the prepare phase, participants remain blocked.",
      topic: "Consensus Algorithms",
    },
  ],
};

export const SAMPLE_BIO_MODULE: PrepPulseModule = {
  moduleId: "mod_bio_101_cell",
  title: "Cellular Respiration & Krebs Cycle",
  description: "Introductory cell biology module covering glycolysis and electron transport chain.",
  moduleType: "quiz",
  targetSubject: "Biology",
  course: "BIO 101: Cell Biology",
  createdAt: "2026-08-25T08:00:00Z",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 20,
      checkpointPassThreshold: 0.8,
    },
  },
  questions: [
    {
      id: "q_bio_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Where in eukaryotic cells does glycolysis take place?",
      options: [
        { id: "b1", text: "Cytoplasm" },
        { id: "b2", text: "Mitochondrial Matrix" },
        { id: "b3", text: "Inner Mitochondrial Membrane" },
        { id: "b4", text: "Nucleolus" },
      ],
      correctOptionIds: ["b1"],
      explanation: "Glycolysis occurs in the cytosol/cytoplasm without requiring oxygen.",
      topic: "Glycolysis",
    },
    {
      id: "q_bio_002",
      type: "true_false",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "ATP Synthase utilizes the proton motive force to synthesize ATP from ADP and Pi.",
      options: [
        { id: "t", text: "True" },
        { id: "f", text: "False" },
      ],
      correctOptionIds: ["t"],
      explanation: "Protons flowing through F0 rotor turn the F1 catalytic subunit, generating ATP.",
      topic: "Oxidative Phosphorylation",
    },
  ],
};

export const SAMPLE_MATH_MODULE: PrepPulseModule = {
  moduleId: "mod_math_220_linear",
  title: "Eigenvalues, Eigenvectors & Diagonalization",
  description: "Linear algebra matrix transformations and diagonalization conditions.",
  moduleType: "quiz",
  targetSubject: "Mathematics",
  course: "MATH 220: Linear Algebra",
  createdAt: "2026-08-25T09:00:00Z",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 25,
      checkpointPassThreshold: 0.8,
    },
  },
  questions: [
    {
      id: "q_m_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "An n x n matrix A is diagonalizable if and only if:",
      options: [
        { id: "m1", text: "It has n linearly independent eigenvectors" },
        { id: "m2", text: "Its determinant is strictly zero" },
        { id: "m3", text: "All its eigenvalues are zero" },
        { id: "m4", text: "It is upper triangular" },
      ],
      correctOptionIds: ["m1"],
      explanation: "Diagonalizability requires a full basis of n linearly independent eigenvectors.",
      topic: "Diagonalization",
    },
    {
      id: "q_m_002",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt: "What is the trace of a square matrix equal to?",
      options: [
        { id: "m1", text: "The sum of its eigenvalues" },
        { id: "m2", text: "The product of its eigenvalues" },
        { id: "m3", text: "The maximum singular value" },
        { id: "m4", text: "The condition number" },
      ],
      correctOptionIds: ["m1"],
      explanation: "The trace equals both the sum of diagonal entries and the sum of eigenvalues.",
      topic: "Matrix Properties",
    },
  ],
};

export const SAMPLE_UNASSIGNED_MODULE: PrepPulseModule = {
  moduleId: "mod_unassigned_general",
  title: "General Aptitude & Logical Reasoning",
  description: "General diagnostic quiz with no course assignment.",
  moduleType: "quiz",
  targetSubject: "Logic",
  // course is intentionally undefined
  createdAt: "2026-08-25T10:00:00Z",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
    },
  },
  questions: [
    {
      id: "q_un_001",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "If all A are B and all B are C, then all A are C.",
      options: [
        { id: "t", text: "True" },
        { id: "f", text: "False" },
      ],
      correctOptionIds: ["t"],
      explanation: "Syllogistic transitivity holds for universal affirmatives.",
      topic: "Deductive Logic",
    },
  ],
};

export const SAMPLE_PROTECTED_DEMO_MODULE: PrepPulseModule = {
  moduleId: "mod_demo_protected_official",
  title: "Official PrepPulse Onboarding Quiz",
  description: "Protected platform demo module that cannot be deleted by users.",
  moduleType: "quiz",
  targetSubject: "Platform Demo",
  course: "CS 101: Introduction",
  isProtected: true,
  createdAt: "2026-08-20T00:00:00Z",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
    },
  },
  questions: [
    {
      id: "q_demo_01",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is PrepPulse designed for?",
      options: [
        { id: "d1", text: "Rapid checkpoint quizzes and mock exam simulations" },
        { id: "d2", text: "Social media video sharing" },
      ],
      correctOptionIds: ["d1"],
      explanation: "PrepPulse provides high-velocity checkpoint testing and exam preparation.",
      topic: "Overview",
    },
  ],
};

export const SAMPLE_MINIFIED_JSON_STRING = JSON.stringify(SAMPLE_QUIZ_MODULE);

export const SAMPLE_MALFORMED_JSON_CASES = {
  SYNTAX_ERROR: '{"title": "Broken Module", "moduleType": "quiz", questions: [',
  TRUNCATED_JSON: '{"title": "Truncated Module", "moduleType": "quiz", "targetSubject": "CS", "questions": [{"id": "q1",',
  NON_OBJECT_JSON: '["not", "an", "object"]',
  EMPTY_OBJECT: '{}',
  MISSING_QUESTIONS: '{"title": "No Questions", "description": "", "moduleType": "quiz", "targetSubject": "CS", "questions": []}',
  INVALID_TYPE: '{"title": "Bad Type", "description": "", "moduleType": "flashcard", "targetSubject": "CS", "questions": [{"id": "q1", "type": "multiple_choice", "difficulty": "easy", "prompt": "p", "options": [{"id": "o1", "text": "a"}, {"id": "o2", "text": "b"}], "correctOptionIds": ["o1"], "explanation": "exp"}]}',
  MISMATCHED_CORRECT_OPTION: '{"title": "Mismatched Option", "description": "", "moduleType": "quiz", "targetSubject": "CS", "questions": [{"id": "q1", "type": "multiple_choice", "difficulty": "easy", "prompt": "p", "options": [{"id": "o1", "text": "a"}, {"id": "o2", "text": "b"}], "correctOptionIds": ["non_existent_id"], "explanation": "exp"}]}',
  DUPLICATE_OPTION_IDS: '{"title": "Duplicate Options", "description": "", "moduleType": "quiz", "targetSubject": "CS", "questions": [{"id": "q1", "type": "multiple_choice", "difficulty": "easy", "prompt": "p", "options": [{"id": "opt_dup", "text": "a"}, {"id": "opt_dup", "text": "b"}], "correctOptionIds": ["opt_dup"], "explanation": "exp"}]}',
};
