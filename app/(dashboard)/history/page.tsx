"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TestSession } from "@/types";
import {
  History,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch sessions from API
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions");
        const json = await res.json();
        if (json.sessions && json.sessions.length > 0) {
          setSessions(json.sessions);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Failed to fetch sessions from server, scanning localStorage:", err);
      }

      // 2. Scan localStorage for guest sessions
      if (typeof window !== "undefined") {
        const localSessions: TestSession[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("preppulse_guest_session_")) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                localSessions.push(parsed);
              }
            } catch {
              // ignore corrupt items
            }
          }
        }
        setSessions(localSessions);
      }
      setLoading(false);
    }

    loadSessions();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-[#262626] px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white">
                Attempt History & Logs
              </h1>
              <p className="text-xs text-neutral-400">Historical performance records and diagnostic reports</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-400">Loading test history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0a0a0a] border border-[#262626] space-y-4 max-w-lg mx-auto mt-8">
            <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#333333] text-white flex items-center justify-center mx-auto">
              <History className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              No Test Attempts Found
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              You haven&apos;t completed any quiz checkpoints or mock exams yet. Start a session to view diagnostic analytics here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all"
            >
              <span>Explore Modules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => {
              const isQuiz = session.sessionType === "quiz";
              const isPassed = session.status === "passed" || session.scorePercentage >= 60;
              const sessionId = session.id || `session_${idx}`;

              return (
                <div
                  key={sessionId}
                  className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#262626] hover:border-neutral-500 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="p-2.5 rounded-xl mt-0.5 bg-[#111111] border border-[#333333] text-white"
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <XCircle className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono"
                        >
                          {isQuiz ? "Rapid Quiz" : "Mock Exam"}
                        </span>

                        <span className="text-xs text-neutral-400 font-mono">
                          {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "Recent"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {session.moduleId || "PrepPulse Module"}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-white" />
                          <span>{session.correctAnswers} / {session.totalQuestions} ({session.scorePercentage}%)</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-white" />
                          <span>{formatDuration(session.timeSpentSeconds)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/results/${sessionId}`}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <span>View Scorecard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

