/**
 * PrepPulse Test Fixtures - Sample Course Texts
 */
export const SAMPLE_SYLLABUS_TEXT = `
Course: CS 401 - Advanced Artificial Intelligence
Topic 1: Neural Architectures & Residual Networks
Residual skip connections add identity shortcuts F(x) + x to prevent vanishing gradients in deep layers.
Batch Normalization normalizes activations across the mini-batch dimension, whereas Layer Normalization normalizes across features within each single sample.

Topic 2: Optimization and Transformers
Adam combines first-order momentum with second-order squared gradient moment estimates.
Transformers utilize multi-head self-attention, scaling with quadratic complexity O(N^2) relative to sequence length.

Topic 3: Regularization & Overfitting
Dropout randomly zeroes out activations during training to prevent co-adaptation, but must be disabled at test/inference time.
Data augmentation, early stopping, and L2 weight decay are standard regularization methods.
`;

export const SAMPLE_CLOUD_SYLLABUS_TEXT = `
Course: CS 501 - Distributed Systems & Cloud Architecture
Module 1: Consensus Protocols (Raft & Paxos)
Raft utilizes randomized election timeouts to avoid split-vote deadlock during leader election.
Two-Phase Commit (2PC) is a blocking transaction protocol that does not tolerate coordinator crashes.

Module 2: Partitioning & CAP Theorem
Consistent hashing using virtual nodes eliminates hotspotting on key distribution rings.
According to the CAP theorem, distributed databases must choose between strong consistency (CP) or high availability (AP) in the presence of network partitions.
`;
