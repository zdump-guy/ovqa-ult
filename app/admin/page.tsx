"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Trash2,
  Play,
  Search,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FileCode2,
  BrainCircuit,
  Layers,
  Eye,
  X,
  Check,
  LogOut,
  Edit3,
} from "lucide-react";
import { PrepPulseModule, Question } from "@/types";
import {
  fetchPublicModules,
  saveLocalCustomModule,
  saveLocalCustomModules,
  deleteLocalCustomModule,
  clearSessionCacheForModule,
} from "@/lib/guest-session";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";
import { adminLogout } from "@/app/admin/actions";
import { JsonFileUpload } from "@/components/upload/JsonFileUpload";
import { JsonModuleEditor } from "@/components/editor/JsonModuleEditor";
import { PdfDropzone, GenerateModuleParams } from "@/components/upload/PdfDropzone";
import { ModuleConfigDrawer } from "@/components/upload/ModuleConfigDrawer";

type AdminTab = "catalog" | "upload_json" | "editor" | "ai";

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("catalog");
  const [modules, setModules] = useState<PrepPulseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "quiz" | "exam">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Question Preview Modal State
  const [previewingModule, setPreviewingModule] = useState<PrepPulseModule | null>(null);

  // Editor JSON state when switching between tabs
  const [editorJson, setEditorJson] = useState<string>("");

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedModule, setAiGeneratedModule] = useState<PrepPulseModule | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Load modules from server API & fallback demo modules
  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const publicMods = await fetchPublicModules();
      const map = new Map<string, PrepPulseModule>();

      // 1. Add demo modules
      ALL_DEMO_MODULES.forEach((d) => {
        if (d.moduleId) map.set(d.moduleId, d);
      });
      // 2. Add server modules
      publicMods.forEach((m) => {
        if (m.moduleId) map.set(m.moduleId, m);
      });

      setModules(Array.from(map.values()));
    } catch {
      setModules(ALL_DEMO_MODULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Centralized module publishing handler
  const handlePublishModule = async (
    moduleOrModules: PrepPulseModule | PrepPulseModule[]
  ) => {
    const isArray = Array.isArray(moduleOrModules);
    const payload = isArray ? { modules: moduleOrModules } : moduleOrModules;

    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to publish module to repository");
      }

      const result = await res.json();

      // Save to local storage for local client resilience
      if (isArray) {
        saveLocalCustomModules(moduleOrModules, false);
      } else {
        saveLocalCustomModule(moduleOrModules, false);
      }

      // Refresh central module list and switch to catalog view
      await loadModules();
      setActiveTab("catalog");
      setAiGeneratedModule(null);

      setFeedback({
        type: "success",
        text: isArray
          ? `Successfully published ${result.count || moduleOrModules.length} modules to the public repository!`
          : `Module "${(moduleOrModules as PrepPulseModule).title}" successfully published!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish module";
      setFeedback({ type: "error", text: msg });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // AI Module Generation Handler
  const handleAiGenerate = async (params: GenerateModuleParams) => {
    setIsGenerating(true);
    setAiError(null);
    setAiGeneratedModule(null);

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
      setAiGeneratedModule(mod);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate module";
      setAiError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Module Deletion Handler
  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete module "${title}" (${moduleId}) from the public repository?`
      )
    ) {
      return;
    }

    setDeletingId(moduleId);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/modules?moduleId=${encodeURIComponent(moduleId)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to delete module from repository");
      }

      // Evict from client local storage and session cache
      deleteLocalCustomModule(moduleId);
      clearSessionCacheForModule(moduleId);

      setModules((prev) => prev.filter((m) => m.moduleId !== moduleId));
      setFeedback({
        type: "success",
        text: `Module "${title}" was successfully deleted from the repository.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      setFeedback({ type: "error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered module list
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "quiz"
          ? m.moduleType === "quiz"
          : m.moduleType === "exam";

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        m.title.toLowerCase().includes(query) ||
        m.targetSubject.toLowerCase().includes(query) ||
        (m.course && m.course.toLowerCase().includes(query)) ||
        (m.moduleId && m.moduleId.toLowerCase().includes(query));

      return matchesType && matchesSearch;
    });
  }, [modules, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const quizzes = modules.filter((m) => m.moduleType === "quiz").length;
    const exams = modules.filter((m) => m.moduleType === "exam").length;
    return { total: modules.length, quizzes, exams };
  }, [modules]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Admin Header */}
      <header className="border-b border-[#262626] bg-[#0a0a0a] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-black">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-base font-bold text-white">PrepPulse Admin Portal</span>
              <span className="hidden sm:block text-[11px] text-neutral-400">
                Authoring, Repository Publishing & Course Management Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white border border-[#333333] hover:bg-[#111111] rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Learner Library</span>
            </Link>

            <form action={adminLogout}>
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold text-neutral-400 hover:text-red-400 border border-[#333333] hover:border-red-900/60 hover:bg-red-950/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sign out of Admin Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Summary Stats Banner */}
        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono">
                Admin Console
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {stats.total} Total Modules ({stats.quizzes} Quizzes • {stats.exams} Mock Exams)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Central Repository & Authoring Center</h2>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Create, upload, and inspect modules published to the learner catalog. Ingested modules are instantly synchronized to all learners.
            </p>
          </div>

          <button
            type="button"
            onClick={loadModules}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-red-950/40 border-red-800 text-red-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-1 no-scrollbar">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#0a0a0a] border border-[#262626] gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "catalog"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Module Catalog ({modules.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upload_json")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "upload_json"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload JSON Files</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "editor"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>JSON Code Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ai"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>AI PDF Ingestion</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MODULE CATALOG & MANAGEMENT HUB */}
        {activeTab === "catalog" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, course, subject, or module ID..."
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* Type Filter Chips */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a0a0a] border border-[#262626] shrink-0">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === "all"
                      ? "bg-white text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  All ({modules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("quiz")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === "quiz"
                      ? "bg-white text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Quizzes ({stats.quizzes})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("exam")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === "exam"
                      ? "bg-white text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Exams ({stats.exams})
                </button>
              </div>
            </div>

            {/* Management Table */}
            <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/80 border-b border-[#262626] text-neutral-400 font-mono">
                    <tr>
                      <th className="p-4 font-semibold uppercase tracking-wider">Module / ID</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Type</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Course / Subject</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Questions</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {filteredModules.map((m) => {
                      const isDemo = m.moduleId?.startsWith("demo-");
                      const isBusy = deletingId === m.moduleId;

                      return (
                        <tr key={m.moduleId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-white text-sm">{m.title}</p>
                              <span className="text-[11px] font-mono text-neutral-500 block">
                                ID: {m.moduleId}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                                m.moduleType === "quiz"
                                  ? "bg-amber-950/40 border border-amber-800/60 text-amber-300"
                                  : "bg-blue-950/40 border border-blue-800/60 text-blue-300"
                              }`}
                            >
                              {m.moduleType === "quiz" ? (
                                <>
                                  <Zap className="w-3 h-3 fill-amber-300 text-amber-300" /> Quiz
                                </>
                              ) : (
                                <>
                                  <BookOpen className="w-3 h-3 text-blue-300" /> Exam
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-4">
                            <p className="text-white font-medium">{m.course || "General Studies"}</p>
                            <span className="text-neutral-500 text-[11px]">{m.targetSubject}</span>
                          </td>

                          <td className="p-4 font-mono text-neutral-300">
                            {m.questions.length} questions
                          </td>

                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {/* Preview Questions Button */}
                              <button
                                type="button"
                                onClick={() => setPreviewingModule(m)}
                                className="px-3 py-1.5 rounded-xl bg-black border border-[#333333] hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                                title="Inspect Question Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>

                              {/* Direct Launch Link */}
                              <Link
                                href={m.moduleType === "quiz" ? `/quiz/${m.moduleId}` : `/exam/${m.moduleId}`}
                                className="p-2 rounded-xl bg-black border border-[#333333] hover:border-white text-neutral-300 hover:text-white transition-colors"
                                title="Launch as Player"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </Link>

                              {/* Delete Button */}
                              {!isDemo && m.moduleId && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteModule(m.moduleId!, m.title)}
                                  className="p-2 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-500 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Delete from Repository"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredModules.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500 font-mono">
                          No modules found matching your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-FILE JSON UPLOADER */}
        {activeTab === "upload_json" && (
          <div className="animate-in fade-in duration-200">
            <JsonFileUpload
              defaultCourse="General Studies"
              onBatchImportSuccess={handlePublishModule}
              onImportSuccess={handlePublishModule}
              onSwitchToEditor={(json) => {
                setEditorJson(json);
                setActiveTab("editor");
              }}
              onCancel={() => setActiveTab("catalog")}
            />
          </div>
        )}

        {/* TAB 3: INTERACTIVE JSON EDITOR */}
        {activeTab === "editor" && (
          <div className="animate-in fade-in duration-200">
            <JsonModuleEditor
              initialJson={editorJson}
              defaultCourse="General Studies"
              onImportSuccess={handlePublishModule}
              onSwitchToUpload={() => setActiveTab("upload_json")}
              onCancel={() => setActiveTab("catalog")}
            />
          </div>
        )}

        {/* TAB 4: AI DOCUMENT INGESTION */}
        {activeTab === "ai" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {aiError && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Generated Module Card if available */}
            {aiGeneratedModule && (
              <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono">
                      ✓ Module Generated ({aiGeneratedModule.questions.length} Questions)
                    </span>
                    <h3 className="text-lg font-bold text-white">{aiGeneratedModule.title}</h3>
                    <p className="text-xs text-neutral-400">
                      Subject: {aiGeneratedModule.targetSubject} • Type:{" "}
                      {aiGeneratedModule.moduleType === "quiz" ? "Checkpoint Quiz" : "Mock Exam"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className="px-3.5 py-2 rounded-xl border border-[#333333] bg-black text-xs font-bold text-white hover:bg-[#111111] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Review / Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePublishModule(aiGeneratedModule)}
                      className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Publish to Repository</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <PdfDropzone
              onGenerate={handleAiGenerate}
              isGenerating={isGenerating}
              onJsonDetected={(rawJson) => {
                setEditorJson(rawJson);
                setActiveTab("upload_json");
              }}
            />
          </div>
        )}
      </main>

      {/* QUESTION PREVIEW MODAL */}
      {previewingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#222222] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      previewingModule.moduleType === "quiz"
                        ? "bg-amber-950/60 border border-amber-800 text-amber-300"
                        : "bg-blue-950/60 border border-blue-800 text-blue-300"
                    }`}
                  >
                    {previewingModule.moduleType === "quiz" ? (
                      <>
                        <Zap className="w-3 h-3 fill-amber-300" /> Checkpoint Quiz
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3 h-3" /> Mock Exam
                      </>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {previewingModule.questions.length} Questions
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{previewingModule.title}</h3>
                <p className="text-xs text-neutral-400">
                  Course: <span className="text-neutral-200">{previewingModule.course || "General Studies"}</span> • Subject:{" "}
                  <span className="text-neutral-200">{previewingModule.targetSubject}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewingModule(null)}
                className="p-2 rounded-xl bg-black border border-[#333333] text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewingModule.questions.map((q: Question, idx: number) => {
                const correctSet = new Set(q.correctOptionIds || []);

                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-black border border-[#222222] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#141414] border border-[#2a2a2a] text-neutral-300 font-bold">
                          Q{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono capitalize bg-[#141414] text-neutral-400">
                          {q.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      {q.prompt}
                    </p>

                    {/* Options list */}
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt) => {
                        const isCorrect = correctSet.has(opt.id);

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              isCorrect
                                ? "bg-emerald-950/30 border-emerald-800/80 text-emerald-200"
                                : "bg-[#0d0d0d] border-[#222222] text-neutral-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-neutral-500">
                                {opt.id}:
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                                <Check className="w-3 h-3 stroke-[3]" /> Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-[#0d0d0d] border border-[#222222] text-xs text-neutral-400 space-y-1">
                        <span className="font-bold text-neutral-300 block text-[11px]">
                          Explanation:
                        </span>
                        <p className="leading-relaxed">{q.explanation}</p>
                        {q.sourceReference && (
                          <span className="text-[10px] font-mono text-neutral-500 block pt-1">
                            Ref: {q.sourceReference}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-black/60 border-t border-[#222222] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewingModule(null)}
                className="px-4 py-2.5 rounded-xl border border-[#333333] bg-black text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              <Link
                href={
                  previewingModule.moduleType === "quiz"
                    ? `/quiz/${previewingModule.moduleId}`
                    : `/exam/${previewingModule.moduleId}`
                }
                className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-black text-black" />
                <span>Launch as Player</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Module Config Drawer for AI generated modules */}
      {aiGeneratedModule && (
        <ModuleConfigDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          module={aiGeneratedModule}
          onSave={(updatedMod) => {
            setAiGeneratedModule(updatedMod);
            setIsDrawerOpen(false);
          }}
        />
      )}
    </div>
  );
}
