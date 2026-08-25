"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCheck2,
  FileCode2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Play,
  Layers,
  Tag,
  Zap,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  X,
} from "lucide-react";
import { PrepPulseModule, Question } from "@/types";
import {
  validateModuleJson,
  SAMPLE_QUIZ_MODULE_TEMPLATE,
  SAMPLE_EXAM_MODULE_TEMPLATE,
} from "@/components/editor/JsonModuleEditor";
import { saveLocalCustomModule } from "@/lib/guest-session";

export interface JsonFileUploadProps {
  initialJson?: string;
  initialFileName?: string;
  defaultCourse?: string;
  onImportSuccess?: (module: PrepPulseModule) => void;
  onSwitchToEditor?: (rawJson: string) => void;
  onCancel?: () => void;
}

const SUGGESTED_COURSES = [
  "CS 401: Deep Learning",
  "CS 501: Distributed Systems",
  "BIO 101: Cell Biology",
  "MATH 220: Linear Algebra",
  "CHEM 201: Organic Chemistry",
  "General Studies",
];

export function JsonFileUpload({
  initialJson = "",
  initialFileName = "",
  defaultCourse,
  onImportSuccess,
  onSwitchToEditor,
  onCancel,
}: JsonFileUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawJsonText, setRawJsonText] = useState<string>(initialJson);
  const [fileName, setFileName] = useState<string>(initialFileName);
  const [fileSize, setFileSize] = useState<number>(() =>
    initialJson ? new Blob([initialJson]).size : 0
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [courseInput, setCourseInput] = useState<string>(defaultCourse || "");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<"quiz" | "exam" | null>(null);

  // Sync initialJson if updated from parent
  useEffect(() => {
    if (initialJson && initialJson !== rawJsonText) {
      setRawJsonText(initialJson);
      setFileSize(new Blob([initialJson]).size);
      if (initialFileName) {
        setFileName(initialFileName);
      }
    }
  }, [initialJson, initialFileName, rawJsonText]);

  // Real-time validation against module schema
  const validation = useMemo(() => {
    if (!rawJsonText.trim()) return null;
    return validateModuleJson(rawJsonText);
  }, [rawJsonText]);

  // Set course from valid module when loaded
  useEffect(() => {
    if (validation?.isValid && validation.module) {
      if (!courseInput) {
        setCourseInput(
          validation.module.course ||
            validation.module.targetSubject ||
            "General Studies"
        );
      }
    }
  }, [validation, courseInput]);

  const handleFileProcess = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      setRawJsonText(text);
      setFileName(file.name);
      setFileSize(file.size);

      // Auto-extract course if present
      try {
        const parsed = JSON.parse(text);
        if (parsed.course) {
          setCourseInput(parsed.course);
        } else if (parsed.targetSubject) {
          setCourseInput(parsed.targetSubject);
        }
      } catch {
        // Validation will handle syntax errors
      }
    } catch (err: unknown) {
      console.error("Failed to read JSON file:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".json") || file.type === "application/json") {
        handleFileProcess(file);
      } else {
        alert("Please upload a valid .json file");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileProcess(file);
    }
  };

  const handleReset = () => {
    setRawJsonText("");
    setFileName("");
    setFileSize(0);
    setCourseInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLoadSample = (type: "quiz" | "exam") => {
    const sample =
      type === "quiz" ? SAMPLE_QUIZ_MODULE_TEMPLATE : SAMPLE_EXAM_MODULE_TEMPLATE;
    const jsonStr = JSON.stringify(sample, null, 2);
    setRawJsonText(jsonStr);
    setFileName(type === "quiz" ? "sample_checkpoint_quiz.json" : "sample_mock_exam.json");
    setFileSize(new Blob([jsonStr]).size);
    setCourseInput(sample.course);
  };

  const handleDownloadSample = (type: "quiz" | "exam") => {
    const sample =
      type === "quiz" ? SAMPLE_QUIZ_MODULE_TEMPLATE : SAMPLE_EXAM_MODULE_TEMPLATE;
    const jsonStr = JSON.stringify(sample, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "quiz" ? "preppulse_quiz_template.json" : "preppulse_exam_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedTemplate(type);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleLaunchModule = (destination: "player" | "dashboard" = "player") => {
    if (!validation?.isValid || !validation.module) return;

    const mod = validation.module;
    const finalCourse =
      courseInput.trim() ||
      mod.course?.trim() ||
      mod.targetSubject ||
      "General Studies";
    const finalModuleId =
      mod.moduleId?.trim() ||
      `mod_json_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const finalModule: PrepPulseModule = {
      ...mod,
      moduleId: finalModuleId,
      course: finalCourse,
      createdAt: mod.createdAt || new Date().toISOString(),
    };

    // Save to guest / local storage
    saveLocalCustomModule(finalModule);

    if (onImportSuccess) {
      onImportSuccess(finalModule);
      return;
    }

    if (destination === "dashboard") {
      router.push("/dashboard");
    } else {
      const targetUrl =
        finalModule.moduleType === "quiz"
          ? `/quiz/${finalModuleId}`
          : `/exam/${finalModuleId}`;
      router.push(targetUrl);
    }
  };

  // Extract question type stats
  const questionTypeStats = useMemo(() => {
    if (!validation?.isValid || !validation.module?.questions) return null;
    const counts = { multiple_choice: 0, multi_select: 0, true_false: 0 };
    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };

    for (const q of validation.module.questions) {
      if (q.type in counts) counts[q.type as keyof typeof counts]++;
      if (q.difficulty in difficultyCounts)
        difficultyCounts[q.difficulty as keyof typeof difficultyCounts]++;
    }

    return { counts, difficultyCounts };
  }, [validation]);

  return (
    <div className="w-full flex flex-col space-y-6 text-white font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* No file loaded state: Big Dropzone */}
      {!rawJsonText.trim() ? (
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden ${
              isDragging
                ? "border-white bg-[#141414] scale-[1.01]"
                : "border-[#333333] hover:border-neutral-400 bg-black/60 hover:bg-[#0d0d0d]"
            }`}
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <UploadCloud className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1.5">
              Upload Quiz or Exam JSON File
            </h3>
            <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
              Drag and drop your <code className="text-neutral-200 font-mono px-1.5 py-0.5 rounded bg-[#1a1a1a]">.json</code> file here, or click to browse from your device. No code pasting required.
            </p>

            <button
              type="button"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileCheck2 className="w-4 h-4" />
              )}
              <span>{isLoading ? "Reading JSON..." : "Select .JSON File"}</span>
            </button>
          </div>

          {/* Preset Helper Cards */}
          <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-white" /> Quick Test Samples & Templates
              </div>
              <span className="text-[11px] text-neutral-500">
                Load ready-made files or download schema templates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sample Quiz Card */}
              <div className="p-4 rounded-xl bg-black border border-[#262626] flex items-center justify-between gap-3 hover:border-neutral-500 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-white fill-white" />
                    <p className="text-xs font-bold text-white">Checkpoint Quiz Template</p>
                  </div>
                  <p className="text-[11px] text-neutral-400">5 Questions • 15s Timer • Checkpoints</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSample("quiz")}
                    className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#222222] border border-[#333333] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Test Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSample("quiz")}
                    title="Download Sample Quiz JSON"
                    className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#222222] border border-[#333333] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedTemplate === "quiz" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sample Exam Card */}
              <div className="p-4 rounded-xl bg-black border border-[#262626] flex items-center justify-between gap-3 hover:border-neutral-500 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                    <p className="text-xs font-bold text-white">Mock Exam Template</p>
                  </div>
                  <p className="text-[11px] text-neutral-400">4 Questions • 60m Timer • Pass/Fail</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSample("exam")}
                    className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#222222] border border-[#333333] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Test Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSample("exam")}
                    title="Download Sample Exam JSON"
                    className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#222222] border border-[#333333] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedTemplate === "exam" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* File is loaded / parsed: Show clean, code-free visual status & preview */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top File Meta Bar */}
          <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  validation?.isValid
                    ? "bg-emerald-950/50 border-emerald-800 text-emerald-400"
                    : "bg-red-950/50 border-red-800 text-red-400"
                }`}
              >
                {validation?.isValid ? (
                  <FileCheck2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {fileName || "uploaded_module.json"}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    ({(fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {validation?.isValid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valid {validation.module?.moduleType === "quiz" ? "Quiz" : "Exam"} Module Definition
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validation?.statusText || "Validation Error"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace File
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-400 transition-colors cursor-pointer"
                title="Remove File"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Validation Error Banner (if file is invalid) */}
          {!validation?.isValid && (
            <div className="p-5 rounded-2xl bg-red-950/30 border border-red-900/60 text-white space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-300">
                    Incompatible JSON File Format
                  </h4>
                  <p className="text-xs text-neutral-300">
                    The uploaded JSON file has formatting or schema issues that prevent it from being launched:
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-red-900/40 space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs text-red-200">
                {validation?.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Upload a Different JSON File
                </button>
                {onSwitchToEditor && (
                  <button
                    type="button"
                    onClick={() => onSwitchToEditor(rawJsonText)}
                    className="px-4 py-2 rounded-xl bg-black border border-[#333333] text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5" /> Inspect in Raw Code Editor
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Valid Module Details & Visual Launch Card */}
          {validation?.isValid && validation.module && (
            <div className="space-y-6">
              {/* Main Module Summary Card */}
              <div className="p-6 md:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-6">
                {/* Header with Title & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#262626]">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white shrink-0">
                      {validation.module.moduleType === "quiz" ? (
                        <Zap className="w-6 h-6 fill-white text-white" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono flex items-center gap-1.5">
                          {validation.module.moduleType === "quiz" ? (
                            <>
                              <Zap className="w-3 h-3 fill-white text-white" /> Checkpoint Quiz
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3 text-white" /> Mock Exam
                            </>
                          )}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono">
                          Ready to Launch
                        </span>
                      </div>

                      <h2 className="text-xl md:text-2xl font-extrabold text-white">
                        {validation.module.title}
                      </h2>

                      <p className="text-xs text-neutral-400 font-medium">
                        Subject:{" "}
                        <span className="text-neutral-200 font-semibold">
                          {validation.module.targetSubject}
                        </span>
                        {validation.module.description && (
                          <span className="block text-neutral-400 mt-1">
                            {validation.module.description}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Primary Launch Action in Header */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLaunchModule("player")}
                      className="px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>
                        Launch {validation.module.moduleType === "quiz" ? "Quiz" : "Exam"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module Course Assignment */}
                <div className="p-4 rounded-2xl bg-black border border-[#262626] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-white" /> Course Library Category
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
                      placeholder="e.g. CS 401: Deep Learning"
                      className="flex-1 bg-[#0a0a0a] border border-[#333333] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SUGGESTED_COURSES.slice(0, 3).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCourseInput(c)}
                          className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                            courseInput === c
                              ? "bg-white text-black font-bold border-white"
                              : "bg-[#0a0a0a] text-neutral-400 border-[#333333] hover:text-white hover:border-neutral-500"
                          }`}
                        >
                          {c.split(":")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                    <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Questions
                    </span>
                    <span className="text-lg font-bold text-white font-mono">
                      {validation.module.questions.length}
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {questionTypeStats?.counts.multiple_choice || 0} MCQ •{" "}
                      {questionTypeStats?.counts.multi_select || 0} Multi •{" "}
                      {questionTypeStats?.counts.true_false || 0} T/F
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                    <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Format Mode
                    </span>
                    <span className="text-lg font-bold text-white capitalize">
                      {validation.module.moduleType}
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {validation.module.moduleType === "quiz"
                        ? "Rapid Cognitive Recall"
                        : "Realistic Simulation"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                    <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      {validation.module.moduleType === "quiz"
                        ? "Checkpoints"
                        : "Duration"}
                    </span>
                    <span className="text-lg font-bold text-white font-mono">
                      {validation.module.moduleType === "quiz"
                        ? Math.ceil(
                            validation.module.questions.length /
                              (validation.module.config.quizConfig
                                ?.checkpointInterval || 5)
                          )
                        : `${
                            validation.module.config.examConfig
                              ?.totalDurationMinutes || 60
                          }m`}
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {validation.module.moduleType === "quiz"
                        ? `${
                            validation.module.config.quizConfig
                              ?.timePerQuestionSeconds || 15
                          }s per question`
                        : "Timed Mock Exam"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                    <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Pass Requirement
                    </span>
                    <span className="text-lg font-bold text-white font-mono">
                      {validation.module.moduleType === "quiz"
                        ? `${Math.round(
                            (validation.module.config.quizConfig
                              ?.checkpointPassThreshold || 0.8) * 100
                          )}%`
                        : `${
                            validation.module.config.examConfig
                              ?.passingScorePercentage || 60
                          }%`}
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      Required to clear
                    </span>
                  </div>
                </div>

                {/* Question Preview Accordion */}
                <div className="border-t border-[#262626] pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-white" />
                      <h3 className="text-sm font-bold text-white">
                        Question Roster Preview ({validation.module.questions.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllQuestions(!showAllQuestions)}
                      className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>
                        {showAllQuestions
                          ? "Collapse List"
                          : `View All ${validation.module.questions.length} Questions`}
                      </span>
                      {showAllQuestions ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-3">
                    {(showAllQuestions
                      ? validation.module.questions
                      : validation.module.questions.slice(0, 3)
                    ).map((q: Question, idx: number) => {
                      const isExpanded =
                        expandedQuestionId === q.id || showAllQuestions;
                      return (
                        <div
                          key={q.id || idx}
                          className="p-4 rounded-2xl bg-black border border-[#262626] space-y-3 transition-colors hover:border-[#3a3a3a]"
                        >
                          <div
                            onClick={() =>
                              setExpandedQuestionId(
                                expandedQuestionId === q.id ? null : q.id
                              )
                            }
                            className="flex items-start justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-[#141414] border border-[#333333] flex items-center justify-center text-xs font-bold text-neutral-300 shrink-0 font-mono">
                                {idx + 1}
                              </span>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#141414] border border-[#333333] text-neutral-300 font-mono">
                                    {q.type.replace("_", " ")}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                      q.difficulty === "easy"
                                        ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/60"
                                        : q.difficulty === "medium"
                                        ? "text-amber-400 bg-amber-950/40 border border-amber-800/60"
                                        : "text-red-400 bg-red-950/40 border border-red-800/60"
                                    }`}
                                  >
                                    {q.difficulty}
                                  </span>
                                  {q.checkpoint && (
                                    <span className="text-[10px] text-neutral-500 font-mono">
                                      Checkpoint {q.checkpoint}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
                                  {q.prompt}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="text-neutral-500 hover:text-white p-1"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Options Breakdown */}
                          {isExpanded && (
                            <div className="pl-8 pt-2 space-y-2 border-t border-[#1a1a1a]">
                              <div className="grid grid-cols-1 gap-1.5">
                                {q.options.map((opt) => {
                                  const isCorrect = q.correctOptionIds.includes(
                                    opt.id
                                  );
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                                        isCorrect
                                          ? "bg-emerald-950/30 border-emerald-800/70 text-white font-medium"
                                          : "bg-[#0d0d0d] border-[#222222] text-neutral-400"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                                            isCorrect
                                              ? "bg-emerald-500 text-black"
                                              : "bg-[#1f1f1f] text-neutral-400"
                                          }`}
                                        >
                                          {opt.id.replace("opt_", "")}
                                        </span>
                                        <span>{opt.text}</span>
                                      </div>
                                      {isCorrect && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 font-mono shrink-0">
                                          <Check className="w-3 h-3" /> Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {q.explanation && (
                                <div className="p-2.5 rounded-xl bg-[#111111] border border-[#222222] text-xs text-neutral-300">
                                  <span className="font-bold text-neutral-400 block mb-0.5">
                                    Explanation:
                                  </span>
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!showAllQuestions &&
                      validation.module.questions.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllQuestions(true)}
                          className="w-full py-2.5 rounded-xl bg-black border border-[#262626] hover:border-neutral-500 text-xs font-semibold text-neutral-300 hover:text-white transition-colors text-center cursor-pointer"
                        >
                          + {validation.module.questions.length - 3} more questions in this file (Click to preview all)
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626]">
                <div className="text-xs text-neutral-400">
                  {onSwitchToEditor && (
                    <button
                      type="button"
                      onClick={() => onSwitchToEditor(rawJsonText)}
                      className="text-neutral-400 hover:text-white underline text-xs transition-colors cursor-pointer"
                    >
                      Need to edit raw JSON text? Switch to code editor
                    </button>
                  )}
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
                    onClick={() => handleLaunchModule("dashboard")}
                    className="px-4 py-3 rounded-xl border border-[#333333] bg-black text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#111111] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Save to Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchModule("player")}
                    className="px-6 py-3 rounded-xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span>
                      Launch {validation.module.moduleType === "quiz" ? "Quiz" : "Exam"} Now
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
