"use client";

import React, { useEffect, useRef } from "react";
import { Trash2, Loader2, X } from "lucide-react";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  modulesToDelete: Array<{ moduleId?: string; title: string; course?: string }>;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  modulesToDelete,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const count = modulesToDelete.length;
  const isSingle = count === 1;
  const singleTitle = isSingle ? modulesToDelete[0]?.title : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-[#262626] p-6 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close deletion modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-red-950/50 border border-red-900/50 text-red-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 pr-6">
            <h2 id="delete-modal-title" className="text-base font-bold text-white leading-snug">
              {isSingle ? `Delete "${singleTitle}"?` : `Delete ${count} Modules?`}
            </h2>
            <p id="delete-modal-description" className="text-xs text-neutral-400 leading-relaxed">
              This action is permanent and cannot be undone. The module{isSingle ? "" : "s"} and all
              associated session history, quiz speed-run attempts, and diagnostic scorecards will be
              permanently removed.
            </p>
          </div>
        </div>

        {/* Module Items Preview */}
        {count > 0 && (
          <div className="rounded-2xl bg-black border border-[#262626] p-3 max-h-44 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
              {isSingle ? "Target Module:" : `Selected Modules (${count}):`}
            </div>
            <ul className="space-y-1.5 text-xs">
              {modulesToDelete.map((m, idx) => (
                <li
                  key={m.moduleId || idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#111111] border border-[#222222]"
                >
                  <span className="font-medium text-white truncate max-w-[240px]">
                    {m.title}
                  </span>
                  {m.course && (
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#333333] text-[10px] font-mono text-neutral-300">
                      {m.course}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] text-neutral-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/40"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSingle ? "Delete Permanently" : `Delete ${count} Modules`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
