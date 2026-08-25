"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  Zap,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

export interface GenerateModuleParams {
  extractedText: string;
  moduleType: "quiz" | "exam";
  requestedCount: number;
  subject: string;
  title: string;
  apiKey?: string;
  config: {
    quizConfig?: {
      checkpointInterval: number;
      timePerQuestionSeconds: number;
      checkpointPassThreshold: number;
    };
    examConfig?: {
      totalDurationMinutes: number;
      passingScorePercentage: number;
      shuffleQuestions: boolean;
      shuffleOptions: boolean;
      allowReview: boolean;
    };
  };
}

interface PdfDropzoneProps {
  onGenerate: (params: GenerateModuleParams) => void;
  isGenerating?: boolean;
  initialText?: string;
  initialSubject?: string;
  onJsonDetected?: (rawJson: string, fileName?: string) => void;
}

const AI_SYLLABUS_PRESET = `Course: CS 401 - Advanced Artificial Intelligence & Deep Learning
Topic 1: Neural Architectures & Residual Networks
Residual skip connections add identity shortcuts F(x) + x to prevent vanishing gradients in deep layers.
Batch Normalization normalizes activations across the mini-batch dimension, whereas Layer Normalization normalizes across features within each single sample.

Topic 2: Optimization and Transformers
Adam combines first-order momentum with second-order squared gradient moment estimates.
Transformers utilize multi-head self-attention, scaling with quadratic complexity O(N^2) relative to sequence length.

Topic 3: Regularization & Overfitting
Dropout randomly zeroes out activations during training to prevent co-adaptation, but must be disabled at test/inference time.
Data augmentation, early stopping, and L2 weight decay are standard regularization methods.`;

const CLOUD_SYLLABUS_PRESET = `Course: CS 501 - Distributed Systems & Cloud Architecture
Module 1: Consensus Protocols (Raft & Paxos)
Raft utilizes randomized election timeouts to avoid split-vote deadlock during leader election.
Two-Phase Commit (2PC) is a blocking transaction protocol that does not tolerate coordinator crashes.

Module 2: Partitioning & CAP Theorem
Consistent hashing using virtual nodes eliminates hotspotting on key distribution rings.
According to the CAP theorem, distributed databases must choose between strong consistency (CP) or high availability (AP) in the presence of network partitions.`;

export function PdfDropzone({
  onGenerate,
  isGenerating = false,
  initialText = "",
  initialSubject = "",
  onJsonDetected,
}: PdfDropzoneProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [moduleType, setModuleType] = useState<"quiz" | "exam">("quiz");
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [subject, setSubject] = useState<string>(initialSubject || "Artificial Intelligence & Systems");
  const [title, setTitle] = useState<string>("");
  const [pastedText, setPastedText] = useState<string>(initialText || "");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Load API key from local storage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("gemini_api_key");
      if (stored) {
        setApiKey(stored);
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  // Quiz configuration state
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const checkpointInterval = 5;
  const [passThreshold, setPassThreshold] = useState<number>(0.8);

  // Exam configuration state
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(60);
  const [examPassingScore, setExamPassingScore] = useState<number>(60);

  // File upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    text: string;
    wordCount: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processUploadedFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    // Auto-detect JSON files directly
    const isJsonFile = file.name.endsWith(".json") || file.type === "application/json";
    if (isJsonFile) {
      try {
        const text = await file.text();
        if (onJsonDetected) {
          onJsonDetected(text, file.name);
          setIsUploading(false);
          return;
        }
        setUploadedFile({
          name: file.name,
          size: file.size,
          text: text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        });
        if (!title) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.title) setTitle(parsed.title);
            if (parsed.targetSubject) setSubject(parsed.targetSubject);
          } catch {
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(`Prep: ${cleanBaseName}`);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to read JSON file";
        setUploadError(msg);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setUploadedFile({
        name: file.name,
        size: file.size,
        text: data.extractedText,
        wordCount: data.wordCount || 0,
      });

      if (!title) {
        const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(`Prep: ${cleanBaseName}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract text from file";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }, [title, onJsonDetected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  }, [processUploadedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processUploadedFile(file);
    }
  };

  const loadPresetText = (preset: string, subjName: string, defaultTitle: string) => {
    setPastedText(preset);
    setSubject(subjName);
    setTitle(defaultTitle);
    setActiveTab("paste");
  };

  const handleGenerateClick = () => {
    const rawText = activeTab === "upload" ? uploadedFile?.text || "" : pastedText;

    if (apiKey.trim()) {
      try {
        localStorage.setItem("gemini_api_key", apiKey.trim());
      } catch {
        // Ignore
      }
    }

    const payload: GenerateModuleParams = {
      extractedText: rawText,
      moduleType,
      requestedCount: questionCount,
      subject: subject.trim() || "Course Material",
      title: title.trim() || `Generated: ${subject} (${moduleType === "quiz" ? "Checkpoint Quiz" : "Mock Exam"})`,
      apiKey: apiKey.trim() || undefined,
      config:
        moduleType === "quiz"
          ? {
              quizConfig: {
                checkpointInterval,
                timePerQuestionSeconds: timePerQuestion,
                checkpointPassThreshold: passThreshold,
              },
            }
          : {
              examConfig: {
                totalDurationMinutes: examDurationMinutes,
                passingScorePercentage: examPassingScore,
                shuffleQuestions: true,
                shuffleOptions: true,
                allowReview: true,
              },
            },
    };

    onGenerate(payload);
  };

  return (
    <div className="w-full space-y-6 text-white">
      {/* Tab Selection */}
      <div className="flex border-b border-[#262626] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "upload"
              ? "border-white text-white"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Upload Document (PDF / Text)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("paste")}
          className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "paste"
              ? "border-white text-white"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" /> Paste Syllabus / Notes
        </button>
      </div>

      {/* Input Area */}
      {activeTab === "upload" ? (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? "border-white bg-[#111111] scale-[1.01]"
                : "border-[#333333] bg-black hover:border-neutral-400 hover:bg-[#0a0a0a]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Click to upload or drag & drop course document
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Supports PDF, Plain Text (.txt), Markdown (.md)
              </p>
            </div>

            {isUploading && (
              <div className="flex items-center gap-2 text-white text-sm font-medium animate-pulse">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Extracting document content...
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#111111] border border-neutral-700 text-white text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-neutral-300" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadedFile && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#111111] border border-[#333333] flex items-center justify-center text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-neutral-400">
                    {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.wordCount} words extracted
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedFile(null);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#111111] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste syllabus text, lecture notes, textbook excerpts, or key review terms here..."
            rows={7}
            className="w-full rounded-xl border border-[#333333] p-4 text-sm focus:border-white focus:outline-none focus:ring-1 focus:ring-white bg-black text-white font-mono"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-neutral-400 font-mono">
              {pastedText.trim().split(/\s+/).filter(Boolean).length} words entered
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() =>
                  loadPresetText(
                    AI_SYLLABUS_PRESET,
                    "Artificial Intelligence & Deep Learning",
                    "AI 401: Deep Learning Review"
                  )
                }
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#111111] border border-[#333333] text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                AI & Neural Nets
              </button>
              <button
                type="button"
                onClick={() =>
                  loadPresetText(
                    CLOUD_SYLLABUS_PRESET,
                    "Distributed Systems & Cloud Architecture",
                    "CS 501: Distributed Consensus & CAP"
                  )
                }
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#111111] border border-[#333333] text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                Distributed Systems
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Testing Mode Selection */}
      <div className="space-y-3 pt-2">
        <label className="block text-sm font-semibold text-white">
          Target Testing Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => {
              setModuleType("quiz");
              if (questionCount > 30) setQuestionCount(15);
            }}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 ${
              moduleType === "quiz"
                ? "border-white bg-[#111111]"
                : "border-[#262626] bg-black hover:border-[#333333]"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                moduleType === "quiz"
                  ? "bg-white text-black font-bold"
                  : "bg-[#111111] border border-[#333333] text-white"
              }`}
            >
              <Zap className={`w-5 h-5 ${moduleType === "quiz" ? "fill-black text-black" : "fill-white text-white"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Rapid Checkpoint Quiz</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Fast-paced recall engine with 5-question tiers, micro-timers (15s/q), and checkpoint pass gates (80%).
              </p>
            </div>
          </div>

          <div
            onClick={() => {
              setModuleType("exam");
              if (questionCount < 20) setQuestionCount(25);
            }}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 ${
              moduleType === "exam"
                ? "border-white bg-[#111111]"
                : "border-[#262626] bg-black hover:border-[#333333]"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                moduleType === "exam"
                  ? "bg-white text-black font-bold"
                  : "bg-[#111111] border border-[#333333] text-white"
              }`}
            >
              <BookOpen className={`w-5 h-5 ${moduleType === "exam" ? "text-black" : "text-white"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Full Mock Exam Simulator</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real exam conditions with collapsible question grid, flag for review (F), sticky duration timer, and scorecard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject and Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            Subject / Academic Domain
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Artificial Intelligence, Microeconomics"
            className="w-full rounded-xl border border-[#333333] p-3 text-sm focus:border-white focus:outline-none focus:ring-1 focus:ring-white bg-black text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            Module Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midterm 2 Comprehensive Prep"
            className="w-full rounded-xl border border-[#333333] p-3 text-sm focus:border-white focus:outline-none focus:ring-1 focus:ring-white bg-black text-white"
          />
        </div>
      </div>

      {/* Sliders & Parameters Configuration */}
      <div className="p-5 rounded-2xl bg-black border border-[#262626] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
            <Sliders className="w-4 h-4 text-white" /> Pipeline Parameters
          </span>
          <span className="text-xs font-medium text-neutral-400 font-mono">
            {questionCount} Questions Selected
          </span>
        </div>

        {/* Question Count Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-neutral-300">
            <span>Target Question Count</span>
            <span className="font-bold text-white font-mono">{questionCount} Questions</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>5 (Quick)</span>
            <span>15 (Standard)</span>
            <span>30 (Intensive)</span>
            <span>50 (Full Exam)</span>
          </div>
        </div>

        {/* Mode Specific Controls */}
        {moduleType === "quiz" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Pace (Seconds/Question)</span>
                <span className="font-semibold text-white font-mono">{timePerQuestion}s</span>
              </label>
              <input
                type="range"
                min={10}
                max={45}
                step={5}
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Checkpoint Pass Threshold</span>
                <span className="font-semibold text-white font-mono">{Math.round(passThreshold * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.6}
                max={1.0}
                step={0.1}
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Total Exam Duration</span>
                <span className="font-semibold text-white font-mono">{examDurationMinutes} min</span>
              </label>
              <input
                type="range"
                min={15}
                max={120}
                step={15}
                value={examDurationMinutes}
                onChange={(e) => setExamDurationMinutes(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Passing Grade</span>
                <span className="font-semibold text-white font-mono">{examPassingScore}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={examPassingScore}
                onChange={(e) => setExamPassingScore(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Google Gemini API Key Input (Saved Locally) */}
      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
            <Key className="w-3.5 h-3.5 text-neutral-400" />
            <span>Google Gemini API Key (Optional / Direct)</span>
          </label>
          <span className="text-[10px] text-neutral-500 font-mono">Saved in browser</span>
        </div>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy... (Leave empty to use server .env key or offline engine)"
            className="w-full bg-black border border-[#333333] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono pr-10"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            title={showApiKey ? "Hide API Key" : "Show API Key"}
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-neutral-400">
          Provides live instructor-grade question generation via Gemini 1.5 Pro / 2.0 Flash directly from your lecture slides.
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={isGenerating || isUploading}
        onClick={handleGenerateClick}
        className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 active:scale-[0.99] flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Analyzing Material & Generating Questions...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-black" />
            Generate {moduleType === "quiz" ? "Checkpoint Quiz" : "Exam Module"}
          </>
        )}
      </button>
    </div>
  );
}

