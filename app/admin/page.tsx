"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Trash2,
  Play,
  PlusCircle,
  Search,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { PrepPulseModule } from "@/types";
import { fetchPublicModules } from "@/lib/guest-session";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";

export default function AdminConsolePage() {
  const [modules, setModules] = useState<PrepPulseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const publicMods = await fetchPublicModules();
      const map = new Map<string, PrepPulseModule>();

      // Add demo modules
      ALL_DEMO_MODULES.forEach((d) => {
        if (d.moduleId) map.set(d.moduleId, d);
      });
      // Add server modules
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

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete module "${title}" (${moduleId}) from the public repository?`)) {
      return;
    }

    setDeletingId(moduleId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/modules?moduleId=${encodeURIComponent(moduleId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete module from repository");
      }

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

  const filteredModules = modules.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(query) ||
      m.targetSubject.toLowerCase().includes(query) ||
      (m.course && m.course.toLowerCase().includes(query)) ||
      m.moduleId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Admin Header */}
      <header className="border-b border-[#262626] bg-[#0a0a0a] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-black">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Admin Control Console</span>
              <span className="block text-[11px] text-neutral-400">
                Global Repository & Module Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white border border-[#333333] hover:bg-[#111111] rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Dashboard</span>
            </Link>
            <Link
              href="/create"
              className="px-3.5 py-2 text-xs font-bold text-black bg-white hover:bg-neutral-200 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-black" />
              <span>Upload Modules</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono">
                Administrator Mode
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {modules.length} Public {modules.length === 1 ? "Module" : "Modules"} in Central Catalog
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Manage Universal Modules</h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              All modules listed here are globally available to all users without authentication. Admins can audit, test, or delete modules from the database.
            </p>
          </div>

          <button
            type="button"
            onClick={loadModules}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-black border border-[#333333] hover:border-neutral-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, course, subject, or module ID..."
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>

        {/* Module Management Table */}
        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 border-b border-[#262626] text-neutral-400 font-mono">
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
                          <Link
                            href={m.moduleType === "quiz" ? `/quiz/${m.moduleId}` : `/exam/${m.moduleId}`}
                            className="p-2 rounded-xl bg-black border border-[#333333] hover:border-white text-neutral-300 hover:text-white transition-colors"
                            title="Launch as Player"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </Link>

                          {!isDemo && m.moduleId && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteModule(m.moduleId!, m.title)}
                              className="p-2 rounded-xl bg-black border border-[#333333] hover:border-red-500 hover:text-red-400 text-neutral-500 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete from Public Database"
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
                      No modules found matching search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
