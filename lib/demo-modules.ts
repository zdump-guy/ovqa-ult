import { PrepPulseModule } from "@/types";

export const DEMO_QUIZ_MODULE: PrepPulseModule = {
  moduleId: "demo-quiz-1",
  title: "Machine Learning & Neural Architectures",
  description:
    "Intensive cognitive recall quiz featuring 3 checkpoints on deep learning fundamentals, convolutions, attention mechanisms, and optimization.",
  moduleType: "quiz",
  targetSubject: "Artificial Intelligence & Deep Learning",
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
    // Checkpoint 1 (Tier 1: Questions 1 to 5)
    {
      id: "q_ml_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "What is the primary mechanism by which Deep Residual Networks (ResNet) mitigate the vanishing gradient problem?",
      options: [
        {
          id: "opt_a",
          text: "Residual skip connections introducing identity mappings that allow unimpeded gradient flow",
        },
        {
          id: "opt_b",
          text: "Replacing standard ReLU activations with Saturating Sigmoid functions",
        },
        {
          id: "opt_c",
          text: "Exponentially scaling the L2 regularization penalty across deep layers",
        },
        {
          id: "opt_d",
          text: "Eliminating all normalization layers throughout the network",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Residual skip connections create direct shortcut paths for gradients to backpropagate directly to earlier layers without diminishing.",
      sourceReference: "Deep Residual Learning for Image Recognition (He et al., 2015)",
    },
    {
      id: "q_ml_002",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "Which optimization algorithm adaptively computes individual learning rates for different parameters using estimates of first and second moments of the gradients?",
      options: [
        { id: "opt_a", text: "Adam (Adaptive Moment Estimation)" },
        { id: "opt_b", text: "Vanilla Stochastic Gradient Descent (SGD)" },
        { id: "opt_c", text: "Batch Gradient Descent without momentum" },
        { id: "opt_d", text: "Simulated Annealing" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Adam maintains exponentially decaying averages of past gradients (first moment) and past squared gradients (second moment).",
      sourceReference: "Adam: A Method for Stochastic Optimization (Kingma & Ba, 2014)",
    },
    {
      id: "q_ml_003",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "L1 regularization tends to produce sparse weight vectors by driving non-critical weights exactly to zero, whereas L2 regularization shrinks weights smoothly toward zero without zeroing them.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Due to its geometric diamond-shaped constraint boundary, L1 regularization intersects axes directly, inducing sparsity and implicit feature selection.",
      sourceReference: "Pattern Recognition and Machine Learning (Bishop, Chapter 3)",
    },
    {
      id: "q_ml_004",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: 'What is the catastrophic failure mode known as "Dying ReLU"?',
      options: [
        {
          id: "opt_a",
          text: "Neurons output 0 and receive 0 gradient for all inputs when their activation permanently becomes negative",
        },
        {
          id: "opt_b",
          text: "The learning rate becomes infinitely large due to gradient explosion",
        },
        {
          id: "opt_c",
          text: "The activation function overflows 32-bit floating point precision",
        },
        {
          id: "opt_d",
          text: "Weights oscillate indefinitely between positive and negative infinity",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "If a neuron receives a large gradient update that shifts its bias such that input is always negative, ReLU gradient is 0, preventing future parameter updates.",
      sourceReference: "Deep Learning Book (Goodfellow et al., Chapter 6)",
    },
    {
      id: "q_ml_005",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "For a multi-class classification problem with 10 mutually exclusive classes, which output activation and loss function pair is mathematically canonical?",
      options: [
        {
          id: "opt_a",
          text: "Softmax activation with Categorical Cross-Entropy Loss",
        },
        {
          id: "opt_b",
          text: "Sigmoid activation with Binary Cross-Entropy Loss",
        },
        { id: "opt_c", text: "Linear activation with Mean Squared Error Loss" },
        { id: "opt_d", text: "Tanh activation with Hinge Loss" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Softmax normalizes class logits into a probability distribution summing to 1.0, paired with categorical cross-entropy for maximum likelihood estimation.",
      sourceReference: "Neural Networks and Deep Learning (Nielsen)",
    },

    // Checkpoint 2 (Tier 2: Questions 6 to 10)
    {
      id: "q_ml_006",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "medium",
      prompt:
        "How does Batch Normalization behave differently during training versus inference/evaluation?",
      options: [
        {
          id: "opt_a",
          text: "Training normalizes via current mini-batch mean/variance; inference uses accumulated running exponential moving averages",
        },
        {
          id: "opt_b",
          text: "Training uses identity pass; inference calculates batch statistics on test data",
        },
        {
          id: "opt_c",
          text: "Training randomly drops 50% of activations; inference scales activations by 2x",
        },
        {
          id: "opt_d",
          text: "Training normalizes across the channel dimension; inference normalizes across the batch dimension",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Batch Normalization tracks moving average statistics during training so that single-sample inference can execute deterministically without batch dependency.",
      sourceReference: "Batch Normalization: Accelerating Deep Network Training (Ioffe & Szegedy, 2015)",
    },
    {
      id: "q_ml_007",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "medium",
      prompt:
        "In the standard Scaled Dot-Product Attention formula Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V, why is the division by sqrt(d_k) crucial?",
      options: [
        {
          id: "opt_a",
          text: "To prevent large dot-products from pushing softmax into regions with vanishingly small gradients",
        },
        {
          id: "opt_b",
          text: "To ensure queries and keys have zero mean and unit variance",
        },
        {
          id: "opt_c",
          text: "To convert quadratic computational complexity O(N^2) into linear complexity O(N)",
        },
        {
          id: "opt_d",
          text: "To enforce orthogonal projection between query and key vectors",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "For large vector dimensions d_k, dot products grow large in magnitude, causing softmax to saturate with extremely small gradients. Dividing by sqrt(d_k) scales variance back to 1.",
      sourceReference: "Attention Is All You Need (Vaswani et al., 2017)",
    },
    {
      id: "q_ml_008",
      type: "multi_select",
      checkpoint: 2,
      difficulty: "medium",
      prompt:
        "Which of the following gates are present in a standard Long Short-Term Memory (LSTM) cell? (Select ALL that apply)",
      options: [
        { id: "opt_a", text: "Forget Gate" },
        { id: "opt_b", text: "Input Gate" },
        { id: "opt_c", text: "Output Gate" },
        { id: "opt_d", text: "Update Gate (exclusive to GRU)" },
      ],
      correctOptionIds: ["opt_a", "opt_b", "opt_c"],
      explanation:
        "LSTM contains three distinct gates: Forget Gate, Input Gate, and Output Gate. GRUs combine forget and input gates into a single Update Gate.",
      sourceReference: "Understanding LSTM Networks (Olah, 2015)",
    },
    {
      id: "q_ml_009",
      type: "multiple_choice",
      checkpoint: 2,
      difficulty: "medium",
      prompt:
        "Given an input image tensor of size 32x32, a 5x5 convolution filter, stride of 1, and valid padding (padding=0), what is the spatial output dimension?",
      options: [
        { id: "opt_a", text: "28x28" },
        { id: "opt_b", text: "32x32" },
        { id: "opt_c", text: "27x27" },
        { id: "opt_d", text: "30x30" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Output dimension formula: (W - F + 2P)/S + 1 = (32 - 5 + 0)/1 + 1 = 28. Hence spatial dimension is 28x28.",
      sourceReference: "CS231n: Convolutional Neural Networks for Visual Recognition",
    },
    {
      id: "q_ml_010",
      type: "true_false",
      checkpoint: 2,
      difficulty: "easy",
      prompt:
        "In self-attention mechanisms, causal masking (autoregressive triangular masking) prevents positions from attending to subsequent future tokens during decoder generation.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Causal masking sets future attention scores to negative infinity (-inf) prior to softmax, ensuring token i only attends to tokens at positions <= i.",
      sourceReference: "Attention Is All You Need (Vaswani et al., 2017)",
    },

    // Checkpoint 3 (Tier 3: Questions 11 to 15)
    {
      id: "q_ml_011",
      type: "multiple_choice",
      checkpoint: 3,
      difficulty: "hard",
      prompt:
        "Why is Layer Normalization (LayerNorm) predominantly favored over Batch Normalization in autoregressive Transformer NLP architectures?",
      options: [
        {
          id: "opt_a",
          text: "LayerNorm normalizes across feature channels per token independently of batch size and dynamic sequence lengths",
        },
        {
          id: "opt_b",
          text: "LayerNorm has zero learnable affine parameters, saving memory",
        },
        {
          id: "opt_c",
          text: "LayerNorm eliminates all matrix multiplications in the feedforward block",
        },
        {
          id: "opt_d",
          text: "LayerNorm prevents the attention matrix from becoming sparse",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Batch Normalization struggles with varying sequence lengths and small batch sizes in NLP. LayerNorm computes mean and variance across the hidden dimension of each token independently.",
      sourceReference: "Layer Normalization (Ba, Kiros, & Hinton, 2016)",
    },
    {
      id: "q_ml_012",
      type: "multiple_choice",
      checkpoint: 3,
      difficulty: "hard",
      prompt:
        "When applying Dropout with probability p during training, what standard technique is used to ensure test-time evaluation requires no adjustments?",
      options: [
        {
          id: "opt_a",
          text: "Inverted Dropout (scaling active activations by 1 / (1 - p) during training)",
        },
        {
          id: "opt_b",
          text: "Multiplying weights by (1 - p) during test time",
        },
        {
          id: "opt_c",
          text: "Setting dropout probability p = 0.5 for all layers universally",
        },
        {
          id: "opt_d",
          text: "Zeroing all gradient updates on disconnected nodes",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Inverted Dropout applies the 1/(1-p) scaling factor during the forward training pass so that test-time evaluation is a pure identity pass without computation.",
      sourceReference:
        "Dropout: A Simple Way to Prevent Neural Networks from Overfitting (Srivastava et al., 2014)",
    },
    {
      id: "q_ml_013",
      type: "multiple_choice",
      checkpoint: 3,
      difficulty: "hard",
      prompt:
        "What is the fundamental difference between Pre-LN and Post-LN Transformer block architectures regarding gradient flow and training stability?",
      options: [
        {
          id: "opt_a",
          text: "Pre-LN applies normalization on the residual branch before sub-layers, allowing stable training without warm-up heuristics",
        },
        {
          id: "opt_b",
          text: "Post-LN eliminates the need for residual connections completely",
        },
        {
          id: "opt_c",
          text: "Pre-LN doubles the parameter count of multi-head attention",
        },
        {
          id: "opt_d",
          text: "Post-LN computes attention across sequence length instead of hidden dimension",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Pre-LN preserves a clean identity path through the entire residual stream, preventing gradient explosion/dissipation at initialization without strict learning rate warmup.",
      sourceReference:
        "On Layer Normalization in the Transformer Architecture (Xiong et al., 2020)",
    },
    {
      id: "q_ml_014",
      type: "multiple_choice",
      checkpoint: 3,
      difficulty: "hard",
      prompt:
        "In an extremely imbalanced binary dataset where positive instances represent only 0.1% of samples, which evaluation metric provides the most reliable signal of model quality?",
      options: [
        {
          id: "opt_a",
          text: "Precision-Recall AUC (PR-AUC / Average Precision)",
        },
        { id: "opt_b", text: "Overall Raw Classification Accuracy" },
        {
          id: "opt_c",
          text: "ROC-AUC (Receiver Operating Characteristic)",
        },
        { id: "opt_d", text: "Mean Absolute Error" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "ROC-AUC can present an overly optimistic assessment in heavily skewed datasets due to the vast number of true negatives in the False Positive Rate denominator. PR-AUC focuses strictly on positive class precision and recall.",
      sourceReference:
        "The Precision-Recall Plot Is More Informative than the ROC Plot (Davis & Goadrich, 2006)",
    },
    {
      id: "q_ml_015",
      type: "true_false",
      checkpoint: 3,
      difficulty: "medium",
      prompt:
        "Learning rate warmup followed by Cosine Annealing decay prevents early training instability from high-variance adaptive optimizer updates before smoothly reducing step sizes.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Warmup protects fragile randomly-initialized weights from divergent updates when gradient statistics are inaccurate, while cosine decay ensures asymptotic convergence to sharp local minima.",
      sourceReference:
        "SGDR: Stochastic Gradient Descent with Warm Restarts (Loshchilov & Hutter, 2016)",
    },
  ],
};

export const DEMO_EXAM_MODULE: PrepPulseModule = {
  moduleId: "demo-exam-1",
  title: "Distributed Systems & Cloud Infrastructure Engineering",
  description:
    "Rigorous full-length mock exam covering consensus protocols, distributed transactions, database isolation, replication models, and resilient microservice architectures.",
  moduleType: "exam",
  targetSubject: "Software Engineering & Distributed Systems",
  course: "BIO 101: Cell Biology",
  createdAt: "2026-08-24T12:00:00Z",
  config: {
    examConfig: {
      totalDurationMinutes: 60,
      passingScorePercentage: 60,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowReview: true,
    },
  },
  questions: [
    {
      id: "q_dist_001",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "According to Eric Brewer's CAP Theorem, when an unavoidable network partition (P) occurs in a distributed data store, what trade-off must the system make?",
      options: [
        {
          id: "opt_a",
          text: "Choose between Consistency (C: returning fresh data or error) and Availability (A: returning non-error response)",
        },
        {
          id: "opt_b",
          text: "Choose between Performance (P) and Durability (D)",
        },
        {
          id: "opt_c",
          text: "Choose between Atomicity (A) and Isolation (I)",
        },
        {
          id: "opt_d",
          text: "Sacrifice Partition Tolerance to guarantee both Consistency and Availability",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "In the presence of a network partition, a system must either decline operations (sacrificing Availability) or accept writes/reads on isolated nodes (sacrificing Linearizable Consistency).",
      sourceReference: "Brewer's CAP Theorem (Lynch & Sethi, 2002)",
    },
    {
      id: "q_dist_002",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "How does the Raft consensus protocol prevent split-vote deadlocks during leader election?",
      options: [
        {
          id: "opt_a",
          text: "Using randomized election timeouts on each candidate node (e.g., 150ms–300ms)",
        },
        {
          id: "opt_b",
          text: "Designating a fixed static master node to break ties",
        },
        {
          id: "opt_c",
          text: "Requiring 100% unanimous agreement from all cluster nodes",
        },
        {
          id: "opt_d",
          text: "Selecting the candidate node with the lowest network latency",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Randomized election timeouts ensure one node times out before others, starting its election campaign and collecting quorum votes before peer timeouts trigger.",
      sourceReference:
        "In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout, 2014)",
    },
    {
      id: "q_dist_003",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        'In Consistent Hashing rings, why are "Virtual Nodes" (vnodes) utilized?',
      options: [
        {
          id: "opt_a",
          text: "To achieve uniform key distribution and prevent hot-spotting across heterogeneous physical servers",
        },
        {
          id: "opt_b",
          text: "To eliminate the need for cryptographic hash functions",
        },
        {
          id: "opt_c",
          text: "To allow nodes to share memory across the network without serialization",
        },
        {
          id: "opt_d",
          text: "To automatically encrypt all data payloads on disk",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "By assigning multiple virtual positions on the hash ring to each physical node, key distributions become statistically uniform, avoiding large contiguous gaps.",
      sourceReference: "Consistent Hashing and Random Trees (Karger et al., 1997)",
    },
    {
      id: "q_dist_004",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "What is the primary operational vulnerability of the classic Two-Phase Commit (2PC) protocol?",
      options: [
        {
          id: "opt_a",
          text: "It is a blocking protocol: if the coordinator crashes during the commit phase after participants vote YES, participants remain locked indefinitely",
        },
        {
          id: "opt_b",
          text: "It cannot guarantee atomic commit across multiple databases",
        },
        {
          id: "opt_c",
          text: "It requires all transactions to be executed in read-only mode",
        },
        {
          id: "opt_d",
          text: "It does not log state changes to disk before committing",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "If the 2PC coordinator fails after participants vote YES but before issuing COMMIT/ABORT, participants cannot unilaterally abort or commit, holding locks indefinitely.",
      sourceReference: "Principles of Distributed Database Systems (Ozsu & Valduriez)",
    },
    {
      id: "q_dist_005",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "In the Saga Pattern for long-running distributed business transactions, how is a failure in a downstream service handled?",
      options: [
        {
          id: "opt_a",
          text: "By executing a sequence of compensating transactions in reverse order to undo prior committed local transactions",
        },
        {
          id: "opt_b",
          text: "By using distributed shared memory locks to roll back physical database logs",
        },
        {
          id: "opt_c",
          text: "By restarting all microservices simultaneously across the cluster",
        },
        {
          id: "opt_d",
          text: "By converting all subsequent HTTP POST calls into idempotent GET requests",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Sagas abandon ACID isolation across services in favor of eventual consistency, triggering compensating actions (e.g. refunding a payment) if a subsequent step fails.",
      sourceReference: "Sagas (Garcia-Molina & Salem, 1987)",
    },
    {
      id: "q_dist_006",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "Which ANSI SQL isolation level prevents Dirty Reads and Non-Repeatable Reads, but may still permit Phantom Reads under lock-based concurrency control?",
      options: [
        { id: "opt_a", text: "Repeatable Read" },
        { id: "opt_b", text: "Read Committed" },
        { id: "opt_c", text: "Read Uncommitted" },
        { id: "opt_d", text: "Serializable" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Repeatable Read locks existing rows read by a query preventing updates/deletes, but range locks (predicate locks) are required by Serializable to prevent new matching rows (phantoms).",
      sourceReference: "A Critique of ANSI SQL Isolation Levels (Berenson et al., 1995)",
    },
    {
      id: "q_dist_007",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "Why are Vector Clocks preferred over Lamport Timestamps when tracking causal history in leaderless distributed key-value stores like Amazon Dynamo?",
      options: [
        {
          id: "opt_a",
          text: "Vector Clocks can detect concurrent, conflicting updates that require application-level reconciliation",
        },
        {
          id: "opt_b",
          text: "Vector Clocks require only a single integer per message, reducing network overhead",
        },
        {
          id: "opt_c",
          text: "Vector Clocks synchronize with physical UTC hardware clocks",
        },
        {
          id: "opt_d",
          text: "Vector Clocks enforce total linearizable ordering across all operations globally",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Lamport timestamps create an arbitrary total order but cannot distinguish whether event A caused B or whether A and B were concurrent. Vector clocks explicitly identify concurrent branches.",
      sourceReference: "Dynamo: Amazon's Highly Available Key-value Store (DeCandia et al., 2007)",
    },
    {
      id: "q_dist_008",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        'In the Circuit Breaker resiliency pattern, what occurs when the state transitions from "Open" to "Half-Open"?',
      options: [
        {
          id: "opt_a",
          text: "A limited number of test requests are permitted through to evaluate if the downstream dependency has recovered",
        },
        {
          id: "opt_b",
          text: "All incoming traffic is permanently redirected to a dead-letter queue",
        },
        {
          id: "opt_c",
          text: "The circuit breaker resets its failure count to zero immediately without testing",
        },
        {
          id: "opt_d",
          text: "The caller thread blocks synchronously until downstream CPU drops below 50%",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "In the Half-Open state, trial requests verify upstream health. If successful, it transitions to Closed; if any fail, it reverts to Open.",
      sourceReference: "Release It!: Design and Deploy Production-Ready Software (Nygard)",
    },
    {
      id: "q_dist_009",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "How does the Bulkhead pattern enhance microservice fault isolation?",
      options: [
        {
          id: "opt_a",
          text: "By isolating thread pools and connection resources so failure in one downstream dependency cannot exhaust system-wide resources",
        },
        {
          id: "opt_b",
          text: "By caching all database queries in local CPU L3 cache",
        },
        {
          id: "opt_c",
          text: "By encrypting intra-cluster traffic with mutual TLS",
        },
        {
          id: "opt_d",
          text: "By compressing JSON payloads into protocol buffers",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Named after ship hull compartments, Bulkhead segregates resources into isolated pools so that cascading resource starvation from a slow dependency does not bring down unrelated services.",
      sourceReference: "Cloud Design Patterns: Bulkhead Pattern (Microsoft Azure Docs)",
    },
    {
      id: "q_dist_010",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "In an Apache Kafka topic configured with 8 partitions and a consumer group containing 12 active consumer instances, how many consumer instances will remain idle?",
      options: [
        { id: "opt_a", text: "4 consumer instances" },
        { id: "opt_b", text: "0 consumer instances" },
        { id: "opt_c", text: "8 consumer instances" },
        { id: "opt_d", text: "2 consumer instances" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Within a single Kafka consumer group, each partition is consumed by at most one consumer instance at any time. With 8 partitions and 12 consumers, 4 consumers have no partition assigned and remain idle.",
      sourceReference: "Kafka: The Definitive Guide (Narkhede et al.)",
    },
    {
      id: "q_dist_011",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "Gossip protocols (epidemic algorithms) achieve probabilistic convergence in O(log N) rounds across decentralized clusters without centralized coordination.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Gossip algorithms transmit state periodically to randomly selected peers, propagating updates exponentially fast across cluster nodes.",
      sourceReference: "Epidemic Algorithms for Replicated Database Maintenance (Demers et al., 1987)",
    },
    {
      id: "q_dist_012",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "In leaderless quorum-replicated systems (e.g. Cassandra) with replication factor N, what strict condition must hold for read operations to always encounter the latest write?",
      options: [
        {
          id: "opt_a",
          text: "Read Quorum (R) + Write Quorum (W) > Replication Factor (N)",
        },
        {
          id: "opt_b",
          text: "Read Quorum (R) == Write Quorum (W) == N",
        },
        {
          id: "opt_c",
          text: "Read Quorum (R) + Write Quorum (W) <= N",
        },
        {
          id: "opt_d",
          text: "Write Quorum (W) > N / 2 with Read Quorum (R) = 1",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "When R + W > N, the set of nodes written to and the set of nodes read from must overlap by at least one node according to the Pigeonhole Principle, guaranteeing read freshness.",
      sourceReference: "Designing Data-Intensive Applications (Kleppmann, Chapter 5)",
    },
    {
      id: "q_dist_013",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        'Why is a "Fencing Token" required when granting distributed locks to clients to ensure mutual exclusion across asynchronous networks?',
      options: [
        {
          id: "opt_a",
          text: "To prevent a client delayed by a GC pause or network stall from writing to storage after its lock lease has expired and been re-acquired by another client",
        },
        {
          id: "opt_b",
          text: "To encrypt the payload between client and lock server",
        },
        {
          id: "opt_c",
          text: "To force lock release if the client fails to heartbeat within 1 millisecond",
        },
        {
          id: "opt_d",
          text: "To bypass the need for a distributed consensus quorum",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "A fencing token is a monotonically increasing number returned by the lock server. The storage service rejects any write with a token lower than the latest accepted token.",
      sourceReference: "How to do distributed locking (Martin Kleppmann, 2016)",
    },
    {
      id: "q_dist_014",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "What is the fundamental benefit of Event Sourcing architecture compared to traditional CRUD database state storage?",
      options: [
        {
          id: "opt_a",
          text: "It preserves an immutable, append-only log of every state change event, providing a complete audit trail and time-travel reconstruction",
        },
        {
          id: "opt_b",
          text: "It guarantees sub-millisecond ACID transactions across multiple cloud providers",
        },
        {
          id: "opt_c",
          text: "It eliminates the need for schema migrations forever",
        },
        {
          id: "opt_d",
          text: "It completely removes database indexing requirements",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Event Sourcing treats business events as first-class immutable facts. Current state is derived by replaying events, enabling auditing, debugging, and multiple read projection models.",
      sourceReference: "Event Sourcing (Martin Fowler, 2005)",
    },
    {
      id: "q_dist_015",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "Which rate-limiting algorithm enforces a strict smooth egress rate regardless of burstiness while queuing excess incoming requests up to a maximum buffer capacity?",
      options: [
        { id: "opt_a", text: "Leaky Bucket" },
        { id: "opt_b", text: "Token Bucket" },
        { id: "opt_c", text: "Fixed Window Counter" },
        { id: "opt_d", text: "Sliding Window Log" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Leaky Bucket smooths out bursts by processing queued requests at a constant tick rate. In contrast, Token Bucket allows short bursts up to the token capacity.",
      sourceReference: "System Design Interview (Alex Xu, Chapter 4)",
    },
    {
      id: "q_dist_016",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "In distributed database crash recovery (ARIES protocol), why is the Write-Ahead Logging (WAL) rule strictly enforced?",
      options: [
        {
          id: "opt_a",
          text: "Log records describing a database modification must be flushed to non-volatile disk before the corresponding dirty data page is written to disk",
        },
        {
          id: "opt_b",
          text: "Data pages must be written to disk before log records are generated in memory",
        },
        {
          id: "opt_c",
          text: "Transactions must write directly to secondary indexes before updating base tables",
        },
        {
          id: "opt_d",
          text: "Checkpoints can only be taken when zero transactions are active",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "The WAL protocol ensures atomicity and durability: if a system crashes while dirty pages are on disk, the database can undo uncommitted changes and redo committed changes from the persisted log.",
      sourceReference: "ARIES: A Transaction Recovery Method (Mohan et al., 1992)",
    },
    {
      id: "q_dist_017",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "What distributed tracing standard propagates Trace IDs and Span IDs across asynchronous microservice boundaries via HTTP headers?",
      options: [
        {
          id: "opt_a",
          text: "W3C Trace Context (traceparent / tracestate)",
        },
        { id: "opt_b", text: "GraphQL Schema Stitching" },
        { id: "opt_c", text: "OAuth 2.0 PKCE" },
        { id: "opt_d", text: "SNMP v3" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "W3C Trace Context defines standard HTTP headers (traceparent containing trace-id, parent-id, and trace-flags) supported across OpenTelemetry implementations.",
      sourceReference: "W3C Recommendation: Trace Context (2020)",
    },
    {
      id: "q_dist_018",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "In a Byzantine Fault Tolerant (BFT) consensus system, what is the minimum total number of nodes (N) required to tolerate f arbitrary/malicious faulty nodes?",
      options: [
        { id: "opt_a", text: "N >= 3f + 1" },
        { id: "opt_b", text: "N >= 2f + 1" },
        { id: "opt_c", text: "N >= f + 1" },
        { id: "opt_d", text: "N >= 4f + 1" },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "To tolerate f Byzantine nodes who may lie or send conflicting messages, the cluster needs at least 2f+1 non-faulty nodes, giving a total of (2f+1) + f = 3f+1 nodes.",
      sourceReference: "Practical Byzantine Fault Tolerance (Castro & Liskov, 1999)",
    },
    {
      id: "q_dist_019",
      type: "true_false",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "In a Service Mesh architecture (e.g. Istio/Envoy), sidecar proxies intercept application networking to provide mutual TLS encryption, circuit breaking, and telemetry without modifying service code.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Sidecars run in the same network namespace as the service container, handling cross-cutting transport layer concerns transparently.",
      sourceReference: "Service Mesh Architecture (Envoy Proxy & Istio Documentation)",
    },
    {
      id: "q_dist_020",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        'What is the "Cache Stampede" (Thundering Herd) problem and what strategy effectively prevents it?',
      options: [
        {
          id: "opt_a",
          text: "Concurrent requests all miss an expired key simultaneously and overload the database; mitigated via distributed mutex locking or probabilistic early recomputation (XFetch)",
        },
        {
          id: "opt_b",
          text: "Cache memory exhaustion causing OOM panics; mitigated by increasing swap space",
        },
        {
          id: "opt_c",
          text: "Network congestion during key eviction; mitigated by using UDP instead of TCP",
        },
        {
          id: "opt_d",
          text: "Stale data returned during replication lag; mitigated by disabling client caching",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "When a hot cache key expires, thousands of simultaneous read requests miss cache and query the backend database concurrently. Mutex locks or XFetch probabilistic refresh solves this.",
      sourceReference: "Optimal Probabilistic Cache Stampede Prevention (Vattani et al., 2015)",
    },
    {
      id: "q_dist_021",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        "Why do columnar storage formats (e.g. Apache Parquet, ClickHouse) drastically outperform row-oriented formats (PostgreSQL heaps) on OLAP analytical aggregate queries?",
      options: [
        {
          id: "opt_a",
          text: "They read only the columns referenced in the query, apply SIMD vectorized instructions, and achieve superior compression on uniform column data types",
        },
        {
          id: "opt_b",
          text: "They store data entirely in uncompressed ASCII text for instant parsing",
        },
        {
          id: "opt_c",
          text: "They disable write locks for single-row insert operations",
        },
        {
          id: "opt_d",
          text: "They execute all queries using MapReduce on disk",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Analytical queries typically scan millions of rows for a few columns. Columnar storage minimizes I/O by reading only required column bytes and compresses column values efficiently with RLE/dictionary encoding.",
      sourceReference: "The Design and Implementation of Modern Column-Oriented Database Systems (Abadi et al.)",
    },
    {
      id: "q_dist_022",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "In the Paxos consensus algorithm, what does Phase 1 (Prepare / Promise) accomplish before Phase 2 (Accept / Accepted)?",
      options: [
        {
          id: "opt_a",
          text: "A proposer acquires a promise from a quorum of acceptors not to accept proposals with lower proposal numbers, and discovers the highest-numbered proposal previously accepted",
        },
        {
          id: "opt_b",
          text: "Acceptors commit the value directly to their state machine without further coordination",
        },
        {
          id: "opt_c",
          text: "The leader flushes log entries to non-volatile disk and shuts down secondary replicas",
        },
        {
          id: "opt_d",
          text: "Clients verify that all cluster nodes are in the same AWS Availability Zone",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Phase 1 guarantees safety: it establishes the proposer's right to lead and surfaces any previously chosen value so the proposer cannot overwrite agreed-upon history.",
      sourceReference: "Paxos Made Simple (Leslie Lamport, 2001)",
    },
    {
      id: "q_dist_023",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt:
        'In reactive stream processing, what is "Reactive Pull-Based Backpressure"?',
      options: [
        {
          id: "opt_a",
          text: "A flow-control mechanism where the subscriber explicitly signals its demand capacity (request(n)), preventing fast producers from overwhelming slow consumers",
        },
        {
          id: "opt_b",
          text: "Dropping 50% of messages when network bandwidth drops below 100 Mbps",
        },
        {
          id: "opt_c",
          text: "Increasing TCP window size automatically during bursts",
        },
        {
          id: "opt_d",
          text: "Buffering unbounded messages in JVM heap memory",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "Reactive Streams backpressure gives consumers control over the emission rate, preventing out-of-memory errors on slow consumers.",
      sourceReference: "Reactive Streams Specification (JVM, 2015)",
    },
    {
      id: "q_dist_024",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt:
        "In active-active multi-region database deployments, why is Conflict-Free Replicated Data Type (CRDT) architecture preferred over Last-Write-Wins (LWW) with NTP timestamps?",
      options: [
        {
          id: "opt_a",
          text: "CRDTs mathematically guarantee deterministic convergence through monotonic join semi-lattices without data loss, whereas LWW silently drops concurrent writes due to clock skew",
        },
        {
          id: "opt_b",
          text: "CRDTs require central coordinator nodes in a single cloud region",
        },
        {
          id: "opt_c",
          text: "CRDTs restrict operations to read-only queries",
        },
        {
          id: "opt_d",
          text: "CRDTs eliminate memory consumption on replicas",
        },
      ],
      correctOptionIds: ["opt_a"],
      explanation:
        "LWW relies on physical clock timestamps which suffer from clock skew (NTP drift), causing newer writes to be discarded. State-based and operation-based CRDTs merge concurrent modifications deterministically without data loss.",
      sourceReference: "Conflict-Free Replicated Data Types (Shapiro et al., 2011)",
    },
    {
      id: "q_dist_025",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt:
        "In distributed database architecture, Sharding partitions data horizontally across multiple database instances to scale write throughput and capacity beyond a single server.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation:
        "Horizontal partitioning (sharding) divides rows across independent physical nodes based on a shard key, enabling horizontal scalability.",
      sourceReference: "Database Internals (Petrov, Chapter 10)",
    },
  ],
};

export const DEMO_MODULES: Record<string, PrepPulseModule> = {
  "demo-quiz-1": DEMO_QUIZ_MODULE,
  "demo-exam-1": DEMO_EXAM_MODULE,
  "mod_demo_ml_quiz": DEMO_QUIZ_MODULE,
  "mod_demo_distributed_exam": DEMO_EXAM_MODULE,
  "00000000-0000-0000-0000-000000000001": DEMO_QUIZ_MODULE,
  "00000000-0000-0000-0000-000000000002": DEMO_EXAM_MODULE,
};

export function getDemoModule(id: string): PrepPulseModule | undefined {
  return DEMO_MODULES[id];
}

export const ALL_DEMO_MODULES: PrepPulseModule[] = [DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE];

export function getAllDemoModules(): PrepPulseModule[] {
  return [DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE];
}

export function isDemoModuleId(id: string): boolean {
  return id in DEMO_MODULES || id.startsWith("demo-") || id.startsWith("mod_demo_");
}
