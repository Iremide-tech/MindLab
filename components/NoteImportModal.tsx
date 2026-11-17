"use client";

import { useState } from "react";

type NoteImportModalProps = {
  open: boolean;
  onClose: () => void;
  isPaid: boolean;
  mapId: string | null;
  onMapGenerated: (payload: {
    title: string;
    nodes: Array<{ id: string; label: string; description?: string }>;
    edges: Array<{ id: string; source: string; target: string }>;
  }) => void;
};

export default function NoteImportModal({
  open,
  onClose,
  isPaid,
  mapId,
  onMapGenerated,
}: NoteImportModalProps) {
  const [importText, setImportText] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!open) return null;

  async function importNoteFromText() {
    const note = importText.trim();
    if (!note) {
      setImportError("Paste a note or choose a .txt file.");
      return;
    }
    if (!isPaid) {
      setImportError("Note import is available on Student and Research plans.");
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note,
          topic: importTitle.trim() || undefined,
          mapId,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (data && data.error) || "Could not build a map from that note."
        );
      }
      onMapGenerated({
        title:
          importTitle.trim() ||
          (typeof data?.title === "string" ? data.title : "Imported notes"),
        nodes: data.nodes || [],
        edges: data.edges || [],
      });
      setImportText("");
      setImportTitle("");
      onClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function handleNoteFile(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      setImportError("Only .txt files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setImportText(value);
      if (!importTitle.trim()) {
        setImportTitle(file.name.replace(/\.txt$/i, ""));
      }
      setImportError(null);
    };
    reader.onerror = () => setImportError("Could not read that file.");
    reader.readAsText(file);
  }

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm">
      <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-lab-surface p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Import notes</h2>
            <p className="mt-1 text-xs text-white/45">
              Paste text or upload a .txt file. AI builds a map from the content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <label className="mb-3 block text-xs text-white/50">
          Optional title
          <input
            value={importTitle}
            onChange={(e) => setImportTitle(e.target.value)}
            placeholder="e.g. Week 3 lecture notes"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-lab-lime/50"
          />
        </label>

        <label className="mb-3 block text-xs text-white/50">
          Notes
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={10}
            placeholder="Paste your notes here…"
            className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-lab-lime/50"
          />
        </label>

        <label className="mb-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-sm text-white/60 transition hover:border-lab-lime/30 hover:text-white/80">
          <input
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => handleNoteFile(e.target.files?.[0] ?? null)}
          />
          Or upload a .txt file
        </label>

        {importError ? <p className="mb-3 text-sm text-red-300">{importError}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importNoteFromText()}
            disabled={importing || !importText.trim()}
            className="min-h-10 flex-1 rounded-xl bg-lab-lime px-3 text-sm font-semibold text-lab-ink disabled:opacity-50"
          >
            {importing ? "Building map…" : "Generate map"}
          </button>
        </div>
      </div>
    </div>
  );
}
