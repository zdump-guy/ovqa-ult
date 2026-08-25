"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Sparkles,
  Play,
  Layers,
  Tag,
  Zap,
  BookOpen,
  ArrowRight,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { PrepPulseModule, Question } from "@/types";
import {
  validateModuleJson,
  JsonValidationResult,
  SAMPLE_QUIZ_MODULE_TEMPLATE,
  SAMPLE_EXAM_MODULE_TEMPLATE,
} from "@/components/editor/JsonModuleEditor";
import {
  saveLocalCustomModule,
  saveLocalCustomModules,
} from "@/lib/guest-session";

export interface UploadedBatchItem {
  id: string;
  fileName: string;
  fileSize: number;
  rawText: string;
  validation: JsonValidationResult;
  courseInput: string;
}

export interface JsonFileUploadProps {
  initialJson?: string;
  initialFileName?: string;
  defaultCourse?: string;
  onImportSuccess?: (module: PrepPulseModule) => void;
  onBatchImportSuccess?: (modules: PrepPulseModule[]) => void;
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
  onBatchImportSuccess,
  onSwitchToEditor,
  onCancel,
}: JsonFileUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batchItems, setBatchItems] = useState<UploadedBatchItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [globalCourseInput, setGlobalCourseInput] = useState<string>(defaultCourse || "");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<"quiz" | "exam" | null>(null);

  // Initialize with initialJson if provided
  useEffect(() => {
    if (initialJson && initialJson.trim()) {
      const val = validateModuleJson(initialJson);
      const initialItem: UploadedBatchItem = {
        id: `file_${Date.now()}_0`,
        fileName: initialFileName || "uploaded_module.json",
        fileSize: new Blob([initialJson]).size,
        rawText: initialJson,
        validation: val,
        courseInput:
          val.module?.course ||
          val.module?.targetSubject ||
          defaultCourse ||
          "General Studies",
      };
      setBatchItems([initialItem]);
    }
  }, [initialJson, initialFileName, defaultCourse]);

  // Process a list of files concurrently
  const processFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      try {
        const jsonFiles = files.filter(
          (f) => f.name.endsWith(".json") || f.type === "application/json"
        );

        if (jsonFiles.length === 0) {
          alert("Please upload valid .json files");
          return;
        }

        const newItems: UploadedBatchItem[] = await Promise.all(
          jsonFiles.map(async (file, idx) => {
            const text = await file.text();
            const val = validateModuleJson(text);

            let detectedCourse = defaultCourse || "General Studies";
            try {
              const parsed = JSON.parse(text);
              if (parsed.course) detectedCourse = parsed.course;
              else if (parsed.targetSubject) detectedCourse = parsed.targetSubject;
            } catch {
              // ignore
            }

            return {
              id: `file_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
              fileName: file.name,
              fileSize: file.size,
              rawText: text,
              validation: val,
              courseInput: detectedCourse,
            };
          })
        );

        setBatchItems((prev) => [...prev, ...newItems]);
      } catch (err) {
        console.error("Failed to process batch files:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [defaultCourse]
  );

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
      const fileList = Array.from(e.dataTransfer.files);
      processFiles(fileList);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      processFiles(fileList);
      e.target.value = "";
    }
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setBatchItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleItemCourseChange = (id: string, newCourse: string) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, courseInput: newCourse } : item))
    );
  };

  const handleApplyGlobalCourse = (courseToApply?: string) => {
    const target = courseToApply !== undefined ? courseToApply : globalCourseInput;
    if (!target.trim()) return;
    setBatchItems((prev) =>
      prev.map((item) => ({ ...item, courseInput: target.trim() }))
    );
  };

  const handleLoadSample = (type: "quiz" | "exam") => {
    const sample =
      type === "quiz" ? SAMPLE_QUIZ_MODULE_TEMPLATE : SAMPLE_EXAM_MODULE_TEMPLATE;
    const jsonStr = JSON.stringify(sample, null, 2);
    const val = validateModuleJson(jsonStr);

    const newItem: UploadedBatchItem = {
      id: `sample_${Date.now()}`,
      fileName: type === "quiz" ? "sample_checkpoint_quiz.json" : "sample_mock_exam.json",
      fileSize: new Blob([jsonStr]).size,
      rawText: jsonStr,
      validation: val,
      courseInput: sample.course,
    };

    setBatchItems((prev) => [...prev, newItem]);
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

  // Convert valid batch items into canonical modules
  const validBatchModules = useMemo(() => {
    const validItems = batchItems.filter((item) => item.validation.isValid && item.validation.module);
    return validItems.map((item) => {
      const mod = item.validation.module!;
      const finalCourse =
        item.courseInput.trim() ||
        mod.course?.trim() ||
        mod.targetSubject ||
        "General Studies";
      const finalId =
        mod.moduleId?.trim() && mod.moduleId.length > 5
          ? mod.moduleId
          : `mod_json_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      return {
        ...mod,
        moduleId: finalId,
        course: finalCourse,
        createdAt: mod.createdAt || new Date().toISOString(),
      };
    });
  }, [batchItems]);

  const invalidBatchItems = useMemo(() => {
    return batchItems.filter((item) => !item.validation.isValid);
  }, [batchItems]);

  // Statistics
  const batchStats = useMemo(() => {
    let quizzes = 0;
    let exams = 0;
    let totalQuestions = 0;

    for (const m of validBatchModules) {
      if (m.moduleType === "quiz") quizzes++;
      else exams++;
      totalQuestions += m.questions.length;
    }

    return {
      total: batchItems.length,
      validCount: validBatchModules.length,
      invalidCount: invalidBatchItems.length,
      quizzes,
      exams,
      totalQuestions,
    };
  }, [batchItems, validBatchModules, invalidBatchItems]);

  // Single module launch handler
  const handleLaunchSingleModule = (item: UploadedBatchItem) => {
    if (!item.validation.isValid || !item.validation.module) return;

    const mod = item.validation.module;
    const finalCourse =
      item.courseInput.trim() ||
      mod.course?.trim() ||
      mod.targetSubject ||
      "General Studies";
    const finalModuleId =
      mod.moduleId?.trim() && mod.moduleId.length > 5
        ? mod.moduleId
        : `mod_json_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const finalModule: PrepPulseModule = {
      ...mod,
      moduleId: finalModuleId,
      course: finalCourse,
      createdAt: mod.createdAt || new Date().toISOString(),
    };

    saveLocalCustomModule(finalModule, true);

    if (onImportSuccess) {
      onImportSuccess(finalModule);
      return;
    }

    const targetUrl =
      finalModule.moduleType === "quiz"
        ? `/quiz/${finalModuleId}`
        : `/exam/${finalModuleId}`;
    router.push(targetUrl);
  };

  // Batch import all valid modules
  const handleImportAll = (destination: "dashboard" | "first_player" = "dashboard") => {
    if (validBatchModules.length === 0) return;

    // Save locally and sync to central cloud database
    saveLocalCustomModules(validBatchModules, true);

    if (onBatchImportSuccess) {
      onBatchImportSuccess(validBatchModules);
      return;
    }

    if (destination === "first_player") {
      const first = validBatchModules[0];
      const targetUrl =
        first.moduleType === "quiz" ? `/quiz/${first.moduleId}` : `/exam/${first.moduleId}`;
      router.push(targetUrl);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 text-white font-sans">
      {/* Hidden Multi-File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* No files loaded: Main Multi-File Dropzone */}
      {batchItems.length === 0 ? (
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
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <UploadCloud className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1.5">
              Upload JSON Files (Single or Multiple)
            </h3>
            <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
              Drag and drop one or multiple <code className="text-neutral-200 font-mono px-1.5 py-0.5 rounded bg-[#1a1a1a]">.json</code> quiz or exam files. Modules will be validated and universally accessible.
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
              <span>{isLoading ? "Processing Files..." : "Select .JSON Files"}</span>
            </button>
          </div>

          {/* Sample Templates Helper */}
          <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-white" /> Quick Test Samples & Templates
              </div>
              <span className="text-[11px] text-neutral-500">
                Test with sample files or download schema templates
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
        /* Files Loaded: Batch Overview & Action Hub */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Batch Summary Bar */}
          <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-black shrink-0">
                <FileCheck2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {batchStats.total} {batchStats.total === 1 ? "File Uploaded" : "Files Uploaded"}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono">
                    ✓ {batchStats.validCount} Ready
                  </span>
                  {batchStats.invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-950/60 border border-red-800 text-red-400 font-mono">
                      ✕ {batchStats.invalidCount} with Errors
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {batchStats.quizzes} Quizzes • {batchStats.exams} Mock Exams • {batchStats.totalQuestions} Total Questions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add More JSON Files
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-400 transition-colors cursor-pointer"
                title="Clear All Files"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Batch Course Categorization Bar */}
          <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-white" /> Batch Assign Course Category
              </label>
              <span className="text-[11px] text-neutral-500 font-mono">
                Applies course tag to all files in this upload batch
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={globalCourseInput}
                onChange={(e) => setGlobalCourseInput(e.target.value)}
                placeholder="e.g. CS 401: Deep Learning"
                className="flex-1 bg-black border border-[#333333] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
              />
              <button
                type="button"
                onClick={() => handleApplyGlobalCourse()}
                className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
              >
                Apply to All
              </button>
              <div className="flex flex-wrap items-center gap-1.5">
                {SUGGESTED_COURSES.slice(0, 3).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setGlobalCourseInput(c);
                      handleApplyGlobalCourse(c);
                    }}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-black text-neutral-400 border border-[#333333] hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
                  >
                    {c.split(":")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module List Cards */}
          <div className="space-y-4">
            {batchItems.map((item, index) => {
              const isValid = item.validation.isValid && item.validation.module;
              const isExpanded = expandedModuleId === item.id;
              const mod = item.validation.module;

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border transition-all overflow-hidden ${
                    isValid
                      ? "bg-[#0a0a0a] border-[#262626] hover:border-neutral-500"
                      : "bg-red-950/20 border-red-900/60"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 border ${
                          isValid
                            ? "bg-[#111111] border-[#333333]"
                            : "bg-red-950/60 border-red-800 text-red-400"
                        }`}
                      >
                        {isValid ? (
                          mod?.moduleType === "quiz" ? (
                            <Zap className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-white" />
                          )
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-neutral-500 font-mono">
                            #{index + 1} {item.fileName} ({(item.fileSize / 1024).toFixed(1)} KB)
                          </span>
                          {isValid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-neutral-300 font-mono">
                              {mod?.moduleType === "quiz" ? "Checkpoint Quiz" : "Mock Exam"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/60 border border-red-800 text-red-300 font-mono">
                              Invalid Schema
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white">
                          {isValid ? mod?.title : "Schema Validation Failed"}
                        </h4>

                        {isValid && (
                          <p className="text-xs text-neutral-400">
                            Course:{" "}
                            <input
                              type="text"
                              value={item.courseInput}
                              onChange={(e) => handleItemCourseChange(item.id, e.target.value)}
                              className="bg-black border border-[#333333] rounded px-2 py-0.5 text-xs text-white font-mono inline-block w-48 focus:outline-none focus:border-white"
                            />{" "}
                            • Subject: <span className="text-neutral-200">{mod?.targetSubject}</span>{" "}
                            • {mod?.questions.length} questions
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions on Card Header */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isValid && (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpandedModuleId(isExpanded ? null : item.id)}
                            className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Questions</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLaunchSingleModule(item)}
                            className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-black text-black" />
                            <span>Launch</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-500 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Validation Error List (if invalid) */}
                  {!isValid && (
                    <div className="px-5 pb-5 pt-2 border-t border-red-900/40 space-y-2">
                      <p className="text-xs font-semibold text-red-300">
                        Issues detected in {item.fileName}:
                      </p>
                      <div className="p-3 rounded-xl bg-black/60 border border-red-900/40 space-y-1 font-mono text-xs text-red-200 max-h-36 overflow-y-auto">
                        {item.validation.errors.map((err, errIdx) => (
                          <div key={errIdx} className="flex items-start gap-1.5">
                            <span className="text-red-500">•</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Preview Accordion */}
                  {isValid && isExpanded && mod && (
                    <div className="px-5 pb-5 pt-3 border-t border-[#1f1f1f] space-y-3 bg-black/40 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-white" /> Questions in this file ({mod.questions.length})
                        </span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {mod.questions.map((q: Question, qIdx: number) => (
                          <div
                            key={q.id || qIdx}
                            className="p-3 rounded-xl bg-black border border-[#262626] space-y-1.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-neutral-400">
                                Q{qIdx + 1}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono capitalize bg-[#141414] text-neutral-300">
                                {q.type.replace("_", " ")}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500">
                                {q.difficulty}
                              </span>
                              <span className="font-semibold text-white truncate flex-1">
                                {q.prompt}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Action Hub */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0a0a0a] border border-[#262626]">
            <div className="text-xs text-neutral-400">
              {onSwitchToEditor && batchItems.length === 1 && (
                <button
                  type="button"
                  onClick={() => onSwitchToEditor(batchItems[0].rawText)}
                  className="text-neutral-400 hover:text-white underline text-xs transition-colors cursor-pointer"
                >
                  Need to edit raw JSON text? Open in code editor
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                disabled={validBatchModules.length === 0}
                onClick={() => handleImportAll("dashboard")}
                className="px-5 py-3 rounded-xl border border-[#333333] bg-black text-xs font-bold text-white hover:bg-[#111111] hover:border-neutral-400 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Layers className="w-4 h-4" />
                <span>Save All ({validBatchModules.length}) to Library</span>
              </button>

              <button
                type="button"
                disabled={validBatchModules.length === 0}
                onClick={() => handleImportAll("first_player")}
                className="px-6 py-3 rounded-xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>
                  {validBatchModules.length > 1
                    ? `Import All & Launch First ${validBatchModules[0]?.moduleType === "quiz" ? "Quiz" : "Exam"}`
                    : `Launch ${validBatchModules[0]?.moduleType === "quiz" ? "Quiz" : "Exam"} Now`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
