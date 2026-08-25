"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  Edit3,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PrepPulseModule, Question, QuestionOption } from "@/types";
import { saveLocalCustomModule } from "@/lib/guest-session";
import { ModuleZodSchema } from "@/lib/schema";

interface ModuleConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  module: PrepPulseModule;
  onSave?: (updatedModule: PrepPulseModule) => void;
}

export function ModuleConfigDrawer({
  isOpen,
  onClose,
  module: initialModule,
  onSave,
}: ModuleConfigDrawerProps) {
  const router = useRouter();
  const [module, setModule] = useState<PrepPulseModule>(initialModule);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({
    [initialModule.questions[0]?.id || ""]: true,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state if initialModule changes
  React.useEffect(() => {
    setModule(initialModule);
    if (initialModule.questions.length > 0) {
      setExpandedQuestions({ [initialModule.questions[0].id]: true });
    }
  }, [initialModule]);

  if (!isOpen) return null;

  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleUpdateField = <K extends keyof PrepPulseModule>(field: K, value: PrepPulseModule[K]) => {
    setModule((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateQuestion = (index: number, updatedQ: Question) => {
    setModule((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = updatedQ;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (module.questions.length <= 1) {
      setValidationError("A module must contain at least 1 question.");
      return;
    }
    setModule((prev) => {
      const newQuestions = prev.questions.filter((_, i) => i !== index);
      return { ...prev, questions: newQuestions };
    });
  };

  const handleAddQuestion = () => {
    const newId = `q_custom_${Date.now().toString(36)}`;
    const newQ: Question = {
      id: newId,
      type: "multiple_choice",
      checkpoint: Math.floor(module.questions.length / (module.config.quizConfig?.checkpointInterval || 5)) + 1,
      difficulty: "medium",
      prompt: "New question prompt",
      options: [
        { id: "opt_a", text: "Correct Option" },
        { id: "opt_b", text: "Distractor Option" },
      ],
      correctOptionIds: ["opt_a"],
      explanation: "Explanation of the correct answer.",
    };

    setModule((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));

    setExpandedQuestions((prev) => ({
      ...prev,
      [newId]: true,
    }));
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, newText: string) => {
    const q = module.questions[qIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = { ...newOptions[optIndex], text: newText };
    handleUpdateQuestion(qIndex, { ...q, options: newOptions });
  };

  const handleToggleCorrectOption = (qIndex: number, optId: string) => {
    const q = module.questions[qIndex];
    let newCorrect: string[];

    if (q.type === "multi_select") {
      if (q.correctOptionIds.includes(optId)) {
        if (q.correctOptionIds.length > 1) {
          newCorrect = q.correctOptionIds.filter((id) => id !== optId);
        } else {
          newCorrect = q.correctOptionIds;
        }
      } else {
        newCorrect = [...q.correctOptionIds, optId];
      }
    } else {
      // Single correct for multiple_choice and true_false
      newCorrect = [optId];
    }

    handleUpdateQuestion(qIndex, { ...q, correctOptionIds: newCorrect });
  };

  const handleAddOption = (qIndex: number) => {
    const q = module.questions[qIndex];
    if (q.type === "true_false") return;
    const nextOptChar = String.fromCharCode(97 + q.options.length); // 'c', 'd', etc.
    const newOpt: QuestionOption = {
      id: `opt_${nextOptChar}`,
      text: `Option ${nextOptChar.toUpperCase()}`,
    };
    handleUpdateQuestion(qIndex, {
      ...q,
      options: [...q.options, newOpt],
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = module.questions[qIndex];
    if (q.options.length <= 2) return;
    const removedOptId = q.options[optIndex].id;
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    const newCorrect = q.correctOptionIds.filter((id) => id !== removedOptId);

    handleUpdateQuestion(qIndex, {
      ...q,
      options: newOptions,
      correctOptionIds: newCorrect.length > 0 ? newCorrect : [newOptions[0].id],
    });
  };

  const handleValidateAndLaunch = () => {
    setValidationError(null);
    const result = ModuleZodSchema.safeParse(module);

    if (!result.success) {
      const firstError = result.error.errors[0]?.message || "Module validation failed";
      setValidationError(firstError);
      return;
    }

    setIsSaving(true);
    const validated = result.data;

    // Save to local storage for instant guest play
    saveLocalCustomModule(validated);
    if (onSave) onSave(validated);

    // Navigate to target player
    const targetRoute =
      validated.moduleType === "quiz"
        ? `/quiz/${validated.moduleId || "custom"}`
        : `/exam/${validated.moduleId || "custom"}`;

    router.push(targetRoute);
  };

  const filteredQuestions = module.questions.filter((q, index) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.prompt.toLowerCase().includes(query) ||
      q.explanation.toLowerCase().includes(query) ||
      `Question ${index + 1}`.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl bg-black border-l border-[#262626] h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 text-white">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#262626] bg-[#0a0a0a] flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono"
              >
                {module.moduleType === "quiz" ? "Quiz Config" : "Exam Config"}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {module.questions.length} Questions
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-white" /> Pre-Launch Module Editor
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#111111] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Section */}
          <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                Module Title
              </label>
              <input
                type="text"
                value={module.title}
                onChange={(e) => handleUpdateField("title", e.target.value)}
                className="w-full rounded-xl border border-[#333333] p-2.5 text-sm font-semibold text-white bg-black focus:border-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Target Subject
                </label>
                <input
                  type="text"
                  value={module.targetSubject}
                  onChange={(e) => handleUpdateField("targetSubject", e.target.value)}
                  className="w-full rounded-xl border border-[#333333] p-2.5 text-sm text-white bg-black focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={module.description}
                  onChange={(e) => handleUpdateField("description", e.target.value)}
                  className="w-full rounded-xl border border-[#333333] p-2.5 text-sm text-white bg-black focus:border-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Question List Header & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#333333] bg-black text-white text-xs focus:border-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3.5 py-2 rounded-xl bg-[#111111] border border-[#333333] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {/* Validation Banner */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-[#111111] border border-neutral-700 text-white text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-neutral-300" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Questions Accordion */}
          <div className="space-y-4">
            {filteredQuestions.map((q, index) => {
              const isExpanded = expandedQuestions[q.id];
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[#262626] bg-[#0a0a0a] overflow-hidden transition-all"
                >
                  {/* Question Header Card */}
                  <div
                    onClick={() => toggleExpand(q.id)}
                    className="p-4 bg-[#0a0a0a] hover:bg-[#111111] cursor-pointer flex items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-white text-black text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-white truncate">
                        {q.prompt || "Untitled Question"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#111111] border border-[#333333] text-neutral-300 font-mono">
                        {q.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#111111] border border-[#333333] text-white font-mono">
                        {q.type.replace("_", " ")}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(index);
                        }}
                        className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#111111] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {/* Question Expanded Content */}
                  {isExpanded && (
                    <div className="p-5 border-t border-[#262626] space-y-4 bg-black">
                      {/* Prompt */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                          Question Prompt
                        </label>
                        <textarea
                          rows={2}
                          value={q.prompt}
                          onChange={(e) =>
                            handleUpdateQuestion(index, { ...q, prompt: e.target.value })
                          }
                          className="w-full rounded-xl border border-[#333333] p-3 text-sm focus:border-white focus:outline-none bg-black text-white"
                        />
                      </div>

                      {/* Difficulty & Question Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                            Difficulty Level
                          </label>
                          <select
                            value={q.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestion(index, {
                                ...q,
                                difficulty: e.target.value as Question["difficulty"],
                              })
                            }
                            className="w-full rounded-xl border border-[#333333] p-2.5 text-xs font-medium text-white bg-black focus:border-white focus:outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                            Question Type
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const newType = e.target.value as Question["type"];
                              if (newType === "true_false") {
                                handleUpdateQuestion(index, {
                                  ...q,
                                  type: newType,
                                  options: [
                                    { id: "opt_t", text: "True" },
                                    { id: "opt_f", text: "False" },
                                  ],
                                  correctOptionIds: ["opt_t"],
                                });
                              } else {
                                handleUpdateQuestion(index, { ...q, type: newType });
                              }
                            }}
                            className="w-full rounded-xl border border-[#333333] p-2.5 text-xs font-medium text-white bg-black focus:border-white focus:outline-none"
                          >
                            <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                            <option value="multi_select">Multi-Select (Multiple Answers)</option>
                            <option value="true_false">True / False</option>
                          </select>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                            Options (Click circle to select correct answer)
                          </label>
                          {q.type !== "true_false" && q.options.length < 6 && (
                            <button
                              type="button"
                              onClick={() => handleAddOption(index)}
                              className="text-[11px] font-bold text-white hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Option
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctOptionIds.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                                  isCorrect
                                    ? "border-2 border-white bg-[#111111]"
                                    : "border-[#333333] bg-black"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleCorrectOption(index, opt.id)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                    isCorrect
                                      ? "bg-white text-black"
                                      : "border-2 border-neutral-600 text-transparent hover:border-white"
                                  }`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) =>
                                    handleOptionTextChange(index, optIdx, e.target.value)
                                  }
                                  className="flex-1 text-xs text-white bg-transparent border-none focus:outline-none"
                                />
                                {q.type !== "true_false" && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(index, optIdx)}
                                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                          Rationale & Explanation
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation}
                          onChange={(e) =>
                            handleUpdateQuestion(index, { ...q, explanation: e.target.value })
                          }
                          className="w-full rounded-xl border border-[#333333] p-2.5 text-xs text-white bg-black focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#333333] text-sm font-semibold text-neutral-300 hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleValidateAndLaunch}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-white hover:bg-neutral-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-black text-black" /> Launch {module.moduleType === "quiz" ? "Quiz" : "Exam"}{" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

