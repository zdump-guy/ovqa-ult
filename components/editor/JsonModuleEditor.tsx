"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCode2,
  Sparkles,
  Play,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Zap,
  Tag,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { PrepPulseModule } from "@/types";
import { ModuleZodSchema } from "@/lib/schema";
import { saveLocalCustomModule } from "@/lib/guest-session";

export interface JsonModuleEditorProps {
  initialJson?: string;
  defaultCourse?: string;
  onImportSuccess?: (module: PrepPulseModule) => void;
  onSwitchToUpload?: () => void;
  onCancel?: () => void;
}

export interface LineError {
  line: number;
  path: string;
  message: string;
}

export interface JsonValidationResult {
  isValid: boolean;
  status: "compatible" | "incompatible" | "invalid_json" | "empty";
  statusText: string;
  module?: PrepPulseModule;
  errors: string[];
  lineErrors: LineError[];
  parsedObject?: unknown;
}

// Built-in Sample Modules for Instant Loading
export const SAMPLE_QUIZ_MODULE_TEMPLATE = {
  title: "Machine Learning & Deep Learning Checkpoint",
  description: "Comprehensive checkpoint quiz covering neural architectures, optimization algorithms, and regularizations.",
  moduleType: "quiz",
  targetSubject: "Artificial Intelligence",
  course: "CS 401: Deep Learning",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
      enableStreakBonus: true,
    },
  },
  questions: [
    {
      id: "q_ml_01",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is the primary architectural purpose of residual skip connections in ResNet?",
      options: [
        { id: "opt_a", text: "Mitigate vanishing gradients by providing identity shortcut paths F(x) + x" },
        { id: "opt_b", text: "Replace non-linear activation functions entirely" },
        { id: "opt_c", text: "Double the total number of trainable weight matrices" },
        { id: "opt_d", text: "Force all gradients to zero during backpropagation" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Residual connections add identity shortcuts F(x) + x, allowing gradients to flow directly through deep layers.",
    },
    {
      id: "q_ml_02",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Batch Normalization computes mean and variance across the mini-batch dimension during training.",
      options: [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" },
      ],
      correctOptionIds: ["opt_true"],
      explanation: "Batch normalization normalizes activations over the batch dimension, whereas Layer Normalization normalizes across features.",
    },
    {
      id: "q_ml_03",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "What is the computational complexity of standard multi-head self-attention relative to sequence length N?",
      options: [
        { id: "opt_a", text: "O(N) linear complexity" },
        { id: "opt_b", text: "O(N^2) quadratic complexity" },
        { id: "opt_c", text: "O(log N) logarithmic complexity" },
        { id: "opt_d", text: "O(1) constant complexity" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Computing the full attention score matrix QK^T requires computing pairwise dot products for all N tokens, scaling as O(N^2).",
    },
    {
      id: "q_ml_04",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "Which optimizer combines adaptive per-parameter learning rates with exponential moving average of first and second moments?",
      options: [
        { id: "opt_a", text: "Standard SGD" },
        { id: "opt_b", text: "Adam (Adaptive Moment Estimation)" },
        { id: "opt_c", text: "Adagrad without decay" },
        { id: "opt_d", text: "Momentum SGD without second-moment estimation" },
      ],
      correctOptionIds: ["opt_b"],
      explanation: "Adam calculates adaptive learning rates by tracking both first-order momentum (mean) and second-order uncentered variance.",
    },
    {
      id: "q_ml_05",
      type: "multi_select",
      checkpoint: 1,
      difficulty: "hard",
      prompt: "Which of the following techniques directly mitigate overfitting in deep neural networks? (Select all)",
      options: [
        { id: "opt_1", text: "Dropout regularization" },
        { id: "opt_2", text: "L2 weight decay" },
        { id: "opt_3", text: "Data augmentation" },
        { id: "opt_4", text: "Removing validation data" },
      ],
      correctOptionIds: ["opt_1", "opt_2", "opt_3"],
      explanation: "Dropout, L2 regularization, and data augmentation encourage robust feature learning and prevent co-adaptation.",
    },
  ],
};

export const SAMPLE_EXAM_MODULE_TEMPLATE = {
  title: "Distributed Systems & Cloud Architecture Comprehensive Exam",
  description: "Full-scale 60-minute mock exam covering consensus protocols, CAP theorem trade-offs, and partition tolerance.",
  moduleType: "exam",
  targetSubject: "Distributed Systems",
  course: "CS 501: Distributed Systems",
  config: {
    examConfig: {
      totalDurationMinutes: 60,
      passingScorePercentage: 65,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowReview: true,
    },
  },
  questions: [
    {
      id: "q_ds_01",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "In the Raft consensus algorithm, how are split-vote deadlocks prevented during leader election?",
      options: [
        { id: "opt_a", text: "Randomized election timeouts chosen per candidate node" },
        { id: "opt_b", text: "Strict round-robin token passing on a physical ring" },
        { id: "opt_c", text: "Deterministic priority based on lowest IP address" },
        { id: "opt_d", text: "Switching immediately to two-phase locking" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Randomized election timeouts (e.g. 150-300ms) ensure nodes start elections at different times, rapidly electing a sole winner.",
    },
    {
      id: "q_ds_02",
      type: "true_false",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "Two-Phase Commit (2PC) is a non-blocking transaction protocol that tolerates coordinator failure without stalling.",
      options: [
        { id: "opt_t", text: "True" },
        { id: "opt_f", text: "False" },
      ],
      correctOptionIds: ["opt_f"],
      explanation: "2PC is inherently blocking. If the coordinator crashes after the prepare phase, cohorts must remain locked and blocked.",
    },
    {
      id: "q_ds_03",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "hard",
      prompt: "Under the CAP theorem, what trade-off must an asynchronous networked database make during a network partition (P)?",
      options: [
        { id: "opt_a", text: "Choose between Linearizable Consistency (CP) or High Availability (AP)" },
        { id: "opt_b", text: "Guarantee both 100% Consistency and Availability simultaneously" },
        { id: "opt_c", text: "Immediately drop all persistent database records" },
        { id: "opt_d", text: "Reboot all database nodes simultaneously" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "During network partition, a system can either cancel operations (preserving consistency) or process writes (preserving availability).",
    },
    {
      id: "q_ds_04",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "medium",
      prompt: "What primary operational problem does consistent hashing with virtual nodes resolve?",
      options: [
        { id: "opt_a", text: "Data hotspotting and uneven load distribution across physical storage servers" },
        { id: "opt_b", text: "Corrupted SQL index pointers" },
        { id: "opt_c", text: "Cross-region network latency spikes" },
        { id: "opt_d", text: "Expired TLS certificates" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Virtual nodes assign each physical server multiple tokens across the hash ring, ensuring uniform shard distribution.",
    },
  ],
};

const SUGGESTED_COURSES = [
  "CS 401: Deep Learning",
  "CS 501: Distributed Systems",
  "BIO 101: Cell Biology",
  "MATH 220: Linear Algebra",
  "CHEM 201: Organic Chemistry",
  "General Studies",
];

export function formatJsonText(
  raw: string,
  indent: number = 2
): { success: boolean; formatted: string; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      success: true,
      formatted: JSON.stringify(parsed, null, indent),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax";
    return {
      success: false,
      formatted: raw,
      error: message,
    };
  }
}

export function validateModuleJson(rawText: string): JsonValidationResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      isValid: false,
      status: "empty",
      statusText: "Enter or Paste JSON Module",
      errors: ["Editor is empty. Paste a JSON module or load a sample."],
      lineErrors: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Syntax error in JSON";
    let line = 1;
    const matchLine = errorMsg.match(/line (\d+)/i);
    const matchPos = errorMsg.match(/position (\d+)/i);

    if (matchLine) {
      line = parseInt(matchLine[1], 10);
    } else if (matchPos) {
      const pos = parseInt(matchPos[1], 10);
      if (!isNaN(pos)) {
        line = rawText.slice(0, pos).split("\n").length;
      }
    }

    return {
      isValid: false,
      status: "invalid_json",
      statusText: "Invalid JSON Syntax",
      errors: [errorMsg],
      lineErrors: [{ line, path: "syntax", message: errorMsg }],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      status: "incompatible",
      statusText: "Incompatible Schema",
      errors: ["Root JSON entity must be an object representing a PrepPulseModule"],
      lineErrors: [{ line: 1, path: "root", message: "Root must be a JSON object" }],
      parsedObject: parsed,
    };
  }

  const lines = rawText.split("\n");
  const errors: string[] = [];
  const lineErrors: LineError[] = [];

  const zodResult = ModuleZodSchema.safeParse(parsed);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const pathStr = issue.path.join(".");
      const leafKey = issue.path[issue.path.length - 1];
      let lineNum = 1;

      // Locate line in text
      if (typeof leafKey === "string") {
        const needle = `"${leafKey}"`;
        const foundIdx = lines.findIndex((l) => l.includes(needle));
        if (foundIdx !== -1) lineNum = foundIdx + 1;
      } else if (typeof leafKey === "number" && issue.path[0] === "questions") {
        const questionIdx = leafKey;
        // Search question index in lines
        let qCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('"id":') && lines[i].includes("q_")) {
            if (qCount === questionIdx) {
              lineNum = i + 1;
              break;
            }
            qCount++;
          }
        }
      }

      const formattedMsg = pathStr ? `${pathStr}: ${issue.message}` : issue.message;
      errors.push(formattedMsg);
      lineErrors.push({
        line: lineNum,
        path: pathStr || "root",
        message: issue.message,
      });
    }
  }

  // Deep Semantic Question Consistency Validation
  const modObj = parsed as Record<string, unknown>;
  if (Array.isArray(modObj.questions)) {
    modObj.questions.forEach((q: unknown, qIdx: number) => {
      if (typeof q === "object" && q !== null) {
        const qRecord = q as Record<string, unknown>;
        const qId = typeof qRecord.id === "string" ? qRecord.id : `q[${qIdx}]`;
        const options = Array.isArray(qRecord.options) ? qRecord.options : [];
        const optionIdSet = new Set<string>();

        // Check for duplicate option IDs
        options.forEach((opt: unknown, optIdx: number) => {
          if (typeof opt === "object" && opt !== null) {
            const optRecord = opt as Record<string, unknown>;
            if (typeof optRecord.id === "string") {
              if (optionIdSet.has(optRecord.id)) {
                const msg = `Question '${qId}': duplicate option ID '${optRecord.id}'`;
                errors.push(msg);
                lineErrors.push({ line: 1, path: `questions[${qIdx}].options[${optIdx}].id`, message: msg });
              }
              optionIdSet.add(optRecord.id);
            }
          }
        });

        // Check correctOptionIds existence
        if (Array.isArray(qRecord.correctOptionIds)) {
          for (const cId of qRecord.correctOptionIds) {
            if (typeof cId === "string" && !optionIdSet.has(cId)) {
              const msg = `Question '${qId}': correctOptionId '${cId}' does not match any option ID`;
              errors.push(msg);

              let lineNum = 1;
              const needle = `"${cId}"`;
              const foundIdx = lines.findIndex((l) => l.includes(needle));
              if (foundIdx !== -1) lineNum = foundIdx + 1;

              lineErrors.push({
                line: lineNum,
                path: `questions[${qIdx}].correctOptionIds`,
                message: msg,
              });
            }
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      status: "incompatible",
      statusText: "Incompatible Schema",
      errors,
      lineErrors,
      parsedObject: parsed,
    };
  }

  const validModule = zodResult.data as PrepPulseModule;
  const questionCount = validModule.questions.length;
  const typeLabel = validModule.moduleType === "quiz" ? "Checkpoint Quiz" : "Mock Exam";

  return {
    isValid: true,
    status: "compatible",
    statusText: `Compatible (${questionCount} ${questionCount === 1 ? "Question" : "Questions"} • ${typeLabel})`,
    module: validModule,
    errors: [],
    lineErrors: [],
    parsedObject: validModule,
  };
}

export function JsonModuleEditor({
  initialJson,
  defaultCourse,
  onImportSuccess,
  onSwitchToUpload,
  onCancel,
}: JsonModuleEditorProps) {
  const router = useRouter();
  const [jsonText, setJsonText] = useState<string>(() => {
    if (initialJson && initialJson.trim()) {
      return initialJson;
    }
    return JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE, null, 2);
  });

  const [courseInput, setCourseInput] = useState<string>(() => {
    if (defaultCourse) return defaultCourse;
    try {
      if (initialJson) {
        const parsed = JSON.parse(initialJson);
        if (parsed.course) return parsed.course;
        if (parsed.targetSubject) return parsed.targetSubject;
      }
    } catch {
      // ignore
    }
    return SAMPLE_QUIZ_MODULE_TEMPLATE.course || "General Studies";
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [formatFeedback, setFormatFeedback] = useState<string | null>(null);
  const [isErrorDrawerExpanded, setIsErrorDrawerExpanded] = useState<boolean>(true);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const text = await file.text();
        setJsonText(text);
        setFormatFeedback(`Loaded ${file.name}`);
        setTimeout(() => setFormatFeedback(null), 3000);
      } catch {
        setFormatFeedback("Failed to read file");
      }
    }
  };

  // Sync initialJson changes if prop updates
  useEffect(() => {
    if (initialJson !== undefined) {
      setJsonText((prev) => (prev !== initialJson ? initialJson : prev));
    }
  }, [initialJson]);

  // Real-time validation
  const validation = useMemo(() => {
    return validateModuleJson(jsonText);
  }, [jsonText]);

  // Auto-sync course input when valid JSON specifies a course
  useEffect(() => {
    if (validation.isValid && validation.module?.course) {
      setCourseInput(validation.module.course);
    }
  }, [validation.isValid, validation.module?.course]);

  // Synchronized scroll between textarea and line gutter
  const handleScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Line Count calculation
  const lines = useMemo(() => {
    return jsonText.split("\n");
  }, [jsonText]);

  const errorLinesSet = useMemo(() => {
    const set = new Set<number>();
    for (const le of validation.lineErrors) {
      set.add(le.line);
    }
    return set;
  }, [validation.lineErrors]);

  // Actions
  const handleFormatJson = () => {
    const res = formatJsonText(jsonText, 2);
    if (res.success) {
      setJsonText(res.formatted);
      setFormatFeedback("Formatted with 2-space indentation");
      setTimeout(() => setFormatFeedback(null), 2500);
    } else {
      setFormatFeedback(`Format Error: ${res.error}`);
      setTimeout(() => setFormatFeedback(null), 4000);
    }
  };

  const handleLoadSampleQuiz = () => {
    const formatted = JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE, null, 2);
    setJsonText(formatted);
    setCourseInput(SAMPLE_QUIZ_MODULE_TEMPLATE.course);
    setFormatFeedback("Loaded Sample Checkpoint Quiz");
    setTimeout(() => setFormatFeedback(null), 2500);
  };

  const handleLoadSampleExam = () => {
    const formatted = JSON.stringify(SAMPLE_EXAM_MODULE_TEMPLATE, null, 2);
    setJsonText(formatted);
    setCourseInput(SAMPLE_EXAM_MODULE_TEMPLATE.course);
    setFormatFeedback("Loaded Sample Mock Exam");
    setTimeout(() => setFormatFeedback(null), 2500);
  };

  const handleClear = () => {
    setJsonText("");
    setFormatFeedback("Editor cleared");
    setTimeout(() => setFormatFeedback(null), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enable 2-space indentation on Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newText = jsonText.substring(0, start) + "  " + jsonText.substring(end);
      setJsonText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleImportAndLaunch = () => {
    if (!validation.isValid || !validation.module) return;

    const mod = validation.module;
    const finalCourse = courseInput.trim() || mod.course?.trim() || mod.targetSubject || "General Studies";
    const finalModuleId = mod.moduleId?.trim() || `mod_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const finalModule: PrepPulseModule = {
      ...mod,
      moduleId: finalModuleId,
      course: finalCourse,
      createdAt: mod.createdAt || new Date().toISOString(),
    };

    // 1. Save to LocalStorage
    saveLocalCustomModule(finalModule);

    // 2. Invoke callback if supplied
    if (onImportSuccess) {
      onImportSuccess(finalModule);
      return;
    }

    // 3. Default redirect to player
    const targetRoute = finalModule.moduleType === "quiz" ? `/quiz/${finalModuleId}` : `/exam/${finalModuleId}`;
    router.push(targetRoute);
  };

  return (
    <div className="w-full flex flex-col space-y-4 text-white font-sans">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626]">
        {/* Left: Title & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-[#333333] flex items-center justify-center text-white">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Direct JSON Editor</h3>
              {/* Status Badge */}
              {validation.status === "compatible" && (
                <span
                  data-testid="status-badge-compatible"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-700/80 text-emerald-400 font-mono animate-in fade-in"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ✓ {validation.statusText}
                </span>
              )}
              {validation.status === "incompatible" && (
                <span
                  data-testid="status-badge-incompatible"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/60 border border-red-700/80 text-red-400 font-mono animate-in fade-in"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  ✕ Incompatible ({validation.errors.length} {validation.errors.length === 1 ? "Error" : "Errors"})
                </span>
              )}
              {validation.status === "invalid_json" && (
                <span
                  data-testid="status-badge-invalid"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-700/80 text-amber-400 font-mono animate-in fade-in"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ⚠ Invalid JSON Syntax
                </span>
              )}
              {validation.status === "empty" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1a1a1a] border border-[#333333] text-neutral-400 font-mono">
                  Empty
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live schema validation against <code className="text-neutral-300 font-mono">ModuleZodSchema</code>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Upload JSON Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload a .json file from your device"
            className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-neutral-300" />
            Upload File
          </button>

          {onSwitchToUpload && (
            <button
              type="button"
              onClick={onSwitchToUpload}
              title="Switch to visual file upload mode"
              className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Visual Upload Mode
            </button>
          )}

          {/* Format JSON Button */}
          <button
            type="button"
            onClick={handleFormatJson}
            title="Format JSON with 2-space indentation"
            className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            Format JSON
          </button>

          {/* Sample Quiz */}
          <button
            type="button"
            onClick={handleLoadSampleQuiz}
            className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            Sample Quiz
          </button>

          {/* Sample Exam */}
          <button
            type="button"
            onClick={handleLoadSampleExam}
            className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-white" />
            Sample Exam
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy JSON to clipboard"
            className="p-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            title="Clear editor"
            className="p-1.5 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Feedback Banner */}
      {formatFeedback && (
        <div className="px-4 py-2 rounded-xl bg-[#111111] border border-[#333333] text-xs font-mono text-neutral-300 flex items-center justify-between animate-in fade-in">
          <span>{formatFeedback}</span>
        </div>
      )}

      {/* Course Assignment Bar */}
      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-white" /> Target Course Category
          </label>
          <span className="text-[11px] text-neutral-500 font-mono">
            Groups this module in your Dashboard library
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            placeholder="e.g. CS 401: Deep Learning, BIO 101: Cell Biology"
            className="flex-1 bg-black border border-[#333333] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
          />
          {/* Quick Course Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SUGGESTED_COURSES.slice(0, 3).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCourseInput(c)}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                  courseInput === c
                    ? "bg-white text-black font-bold border-white"
                    : "bg-black text-neutral-400 border-[#333333] hover:text-white hover:border-neutral-500"
                }`}
              >
                {c.split(":")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code Editor with Gutter */}
      <div className="relative rounded-2xl border border-[#333333] bg-black overflow-hidden flex flex-col focus-within:border-white transition-colors">
        <div className="flex bg-[#0d0d0d] border-b border-[#262626] px-4 py-2 items-center justify-between text-xs text-neutral-400 font-mono">
          <span>module_definition.json</span>
          <span>{lines.length} lines • {(jsonText.length / 1024).toFixed(1)} KB</span>
        </div>

        <div className="relative flex min-h-[380px] max-h-[540px]">
          {/* Left Gutter: Line Numbers */}
          <div
            ref={lineGutterRef}
            className="w-12 py-4 select-none bg-black border-r border-[#262626] text-right pr-3 font-mono text-xs text-neutral-600 overflow-hidden shrink-0 space-y-0 leading-5"
          >
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const hasError = errorLinesSet.has(lineNum);
              return (
                <div
                  key={idx}
                  className={`h-5 leading-5 transition-colors ${
                    hasError
                      ? "text-red-400 font-bold bg-red-950/30 -mr-3 pr-3"
                      : highlightedLine === lineNum
                      ? "text-white bg-[#1a1a1a] -mr-3 pr-3"
                      : "hover:text-neutral-400"
                  }`}
                >
                  {lineNum}
                </div>
              );
            })}
          </div>

          {/* Main JSON Textarea */}
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder='{\n  "title": "My Custom Module",\n  "moduleType": "quiz",\n  "targetSubject": "Science",\n  "questions": [...]\n}'
            className="flex-1 p-4 bg-black text-white font-mono text-xs sm:text-sm resize-none focus:outline-none overflow-y-auto leading-5 space-y-0"
          />
        </div>
      </div>

      {/* Error & Validation Diagnostic Panel */}
      {validation.lineErrors.length > 0 && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/20 overflow-hidden animate-in fade-in">
          <div
            onClick={() => setIsErrorDrawerExpanded(!isErrorDrawerExpanded)}
            className="flex items-center justify-between p-3.5 bg-red-950/40 border-b border-red-900/40 cursor-pointer text-red-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Compatibility Issues ({validation.lineErrors.length})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-red-400">
              <span>{isErrorDrawerExpanded ? "Collapse" : "Expand"}</span>
              {isErrorDrawerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {isErrorDrawerExpanded && (
            <div className="p-3.5 space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
              {validation.lineErrors.map((err, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setHighlightedLine(err.line);
                    if (textareaRef.current) {
                      // approximate scroll to line
                      const lineHeight = 20;
                      textareaRef.current.scrollTop = Math.max(0, (err.line - 5) * lineHeight);
                    }
                  }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-black/60 border border-red-900/30 hover:border-red-700/60 text-red-300 transition-colors cursor-pointer"
                >
                  <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-200 text-[10px] font-bold shrink-0">
                    Line {err.line}
                  </span>
                  <div className="flex-1 break-words">
                    <span className="text-neutral-400 text-[11px] block">{err.path}</span>
                    <span className="text-white font-sans">{err.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Valid Module Metadata Preview */}
      {validation.isValid && validation.module && (
        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{validation.module.title}</p>
              <p className="text-neutral-400">
                Course: <span className="text-white font-semibold">{courseInput.trim() || validation.module.course || "General Studies"}</span> •{" "}
                Subject: <span className="text-white font-semibold">{validation.module.targetSubject}</span> •{" "}
                {validation.module.questions.length} questions
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-black border border-[#333333] text-neutral-300 text-xs font-mono capitalize self-start sm:self-auto">
            Mode: {validation.module.moduleType}
          </span>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-xs text-neutral-500 font-mono">
          {validation.isValid ? "Ready for instant launch or library persistence" : "Fix schema errors above to enable module import"}
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 rounded-xl border border-[#333333] bg-black text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#111111] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            data-testid="import-and-launch-button"
            disabled={!validation.isValid}
            onClick={handleImportAndLaunch}
            className="px-6 py-3.5 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 active:scale-[0.99] flex items-center justify-center gap-2 text-xs sm:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black text-black" />
            <span>Import to Course & Launch</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
