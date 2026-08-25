"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  BookOpen,
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Play,
  FileCode2,
} from "lucide-react";
import { PdfDropzone, GenerateModuleParams } from "@/components/upload/PdfDropzone";
import { ModuleConfigDrawer } from "@/components/upload/ModuleConfigDrawer";
import { JsonModuleEditor } from "@/components/editor/JsonModuleEditor";
import { PrepPulseModule } from "@/types";
import { saveLocalCustomModule } from "@/lib/guest-session";

export default function CreateModulePage() {
  const router = useRouter();
  const [creationMode, setCreationMode] = useState<"ai" | "direct_json">("ai");
  const [directJsonText, setDirectJsonText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedModule, setGeneratedModule] = useState<PrepPulseModule | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isMockResult, setIsMockResult] = useState<boolean>(false);

  const handleGenerate = async (params: GenerateModuleParams) => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedModule(null);

    try {
      const res = await fetch("/api/generate-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Generation failed with status ${res.status}`);
      }

      const mod: PrepPulseModule = data.module;
      setGeneratedModule(mod);
      setIsMockResult(!!data.isMock);

      // Auto save to local storage for guest play
      saveLocalCustomModule(mod);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate module";
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchDirectly = () => {
    if (!generatedModule) return;
    saveLocalCustomModule(generatedModule);

    const targetUrl =
      generatedModule.moduleType === "quiz"
        ? `/quiz/${generatedModule.moduleId}`
        : `/exam/${generatedModule.moduleId}`;

    router.push(targetUrl);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#262626] bg-black/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold hover:opacity-90">
              <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-black font-black">
                <Zap className="h-4 w-4 fill-black text-black" />
              </div>
              <span className="text-lg">
                Prep<span className="text-neutral-400">Pulse</span>
              </span>
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-sm font-semibold text-neutral-300">Module Creator</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#111111] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12 space-y-8">
        {/* Page Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#333333] text-neutral-300 text-xs font-bold uppercase tracking-wider">
            {creationMode === "ai" ? (
              <>
                <BrainCircuit className="w-4 h-4 text-white" /> AI Document Ingestion
              </>
            ) : (
              <>
                <FileCode2 className="w-4 h-4 text-white" /> Direct JSON Import & Checker
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {creationMode === "ai" ? "Create an AI-Powered Module" : "Direct JSON Module Ingestion"}
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl mx-auto">
            {creationMode === "ai"
              ? "Upload course slides, syllabus, or lecture notes. Our engine converts them into structured 5-question checkpoint quizzes and realistic mock exams."
              : "Paste raw JSON or import pre-formatted module definitions with real-time Zod schema compatibility validation and 2-space formatting."}
          </p>
        </div>

        {/* Creation Ingress Mode Selector Tabs */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#0a0a0a] border border-[#262626] gap-2">
            <button
              type="button"
              onClick={() => setCreationMode("ai")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                creationMode === "ai"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> AI Document Ingestion
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("direct_json")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                creationMode === "direct_json"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <FileCode2 className="w-4 h-4" /> Direct JSON Editor
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {generationError && (
          <div className="p-4 rounded-2xl bg-[#111111] border border-neutral-700 text-white text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Generation Failed</p>
              <p className="text-xs text-neutral-400">{generationError}</p>
            </div>
          </div>
        )}

        {/* Generated Module Success Card */}
        {generatedModule && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#333333] flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono">
                      Module Ready
                    </span>
                    {isMockResult && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a1a1a] border border-[#333333] text-neutral-400">
                        Offline Fallback
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{generatedModule.title}</h2>
                  <p className="text-xs text-neutral-400 font-medium">
                    Subject: {generatedModule.targetSubject}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-[#333333] bg-black text-xs font-bold text-white hover:bg-[#111111] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-white" /> Review & Edit
                </button>
                <button
                  type="button"
                  onClick={handleLaunchDirectly}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-white hover:bg-neutral-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" /> Launch {generatedModule.moduleType === "quiz" ? "Quiz" : "Exam"}
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Questions
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {generatedModule.questions.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Mode
                </span>
                <span className="text-lg font-bold text-white capitalize">
                  {generatedModule.moduleType}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  {generatedModule.moduleType === "quiz" ? "Checkpoints" : "Duration"}
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {generatedModule.moduleType === "quiz"
                    ? Math.ceil(
                        generatedModule.questions.length /
                          (generatedModule.config.quizConfig?.checkpointInterval || 5)
                      )
                    : `${generatedModule.config.examConfig?.totalDurationMinutes || 60}m`}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-[#262626]">
                <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Pass Threshold
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {generatedModule.moduleType === "quiz"
                    ? `${Math.round(
                        (generatedModule.config.quizConfig?.checkpointPassThreshold || 0.8) * 100
                      )}%`
                    : `${generatedModule.config.examConfig?.passingScorePercentage || 60}%`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ingress Main Container */}
        {creationMode === "ai" ? (
          <div className="p-6 md:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-6">
            <PdfDropzone
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onJsonDetected={(json) => {
                setDirectJsonText(json);
                setCreationMode("direct_json");
              }}
            />
          </div>
        ) : (
          <div className="p-6 md:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-6">
            <JsonModuleEditor
              initialJson={directJsonText}
              defaultCourse="General Studies"
              onImportSuccess={(mod) => {
                setGeneratedModule(mod);
                const targetUrl = mod.moduleType === "quiz" ? `/quiz/${mod.moduleId}` : `/exam/${mod.moduleId}`;
                router.push(targetUrl);
              }}
            />
          </div>
        )}

        {/* Demo Quick Starts */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Or Launch Pre-Built Demo Modules
            </h3>
            <span className="text-xs text-neutral-400 font-medium">Instant Guest Play</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/quiz/demo-quiz-1"
              className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#262626] hover:border-neutral-400 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#333333] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5 fill-white text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Machine Learning Checkpoint Quiz</p>
                  <p className="text-xs text-neutral-400">15 Questions • 3 Checkpoints • 15s/q</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/exam/demo-exam-1"
              className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#262626] hover:border-neutral-400 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#333333] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Distributed Systems Mock Exam</p>
                  <p className="text-xs text-neutral-400">25 Questions • 60 min Duration</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </main>

      {/* Slide-over Drawer for Question Configuration */}
      {generatedModule && (
        <ModuleConfigDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          module={generatedModule}
          onSave={(updated) => setGeneratedModule(updated)}
        />
      )}
    </div>
  );
}

