"use client";

import { useState } from "react";

import type { MindMapNode } from "@/lib/mindmap";

type KnowledgePanelProps = {
  node: MindMapNode | null;
  onClose: () => void;
  onExpand: () => void;
  expanding: boolean;
};

export default function KnowledgePanel({
  node,
  onClose,
  onExpand,
  expanding,
}: KnowledgePanelProps) {
  const [loading, setLoading] = useState(false);

  const [explanation, setExplanation] =
    useState<string | null>(null);

  if (!node) return null;

  async function explainSimpler() {
    setLoading(true);
    setExplanation(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          label: node.label,
          description: node.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to explain concept"
        );
      }

      setExplanation(data.explanation);
    } catch (error) {
      console.error("Explain error:", error);

      setExplanation(
        "I couldn't explain this concept right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="absolute right-5 top-24 z-30 w-80 rounded-2xl border border-white/10 bg-zinc-950/95 p-5 text-white shadow-2xl backdrop-blur-xl">

      {/* Header */}

      <div className="mb-5 flex items-start justify-between gap-4">

        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-purple-400">
            Concept
          </p>

          <h2 className="text-xl font-bold">
            {node.label}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

      </div>

      {/* Original Description */}

      <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">

        <p className="text-sm leading-6 text-white/70">
          {node.description ||
            "No description available yet."}
        </p>

      </div>

      {/* AI Explanation */}

      {explanation && (
        <div className="mb-5 rounded-xl border border-purple-400/20 bg-purple-500/10 p-4">

          <div className="mb-2 flex items-center gap-2">

            <span className="text-purple-400">
              ✦
            </span>

            <span className="text-xs font-medium uppercase tracking-widest text-purple-400">
              Simpler explanation
            </span>

          </div>

          <p className="text-sm leading-6 text-white/80">
            {explanation}
          </p>

        </div>
      )}

      {/* Action Buttons */}

      <div className="grid grid-cols-2 gap-2">

        {/* Explain Simpler */}

        <button
          onClick={explainSimpler}
          disabled={loading}
          className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-sm transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Thinking..."
            : "Explain simpler"}
        </button>

        {/* Give Example */}

        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          Give example
        </button>

        {/* Explore Deeper */}

        <button
          onClick={onExpand}
          disabled={expanding}
          className="col-span-2 rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-sm font-medium transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {expanding
            ? "Exploring..."
            : "Explore deeper"}
        </button>

        {/* Quiz Me */}

        <button
          className="col-span-2 rounded-xl bg-purple-500 px-3 py-2 text-sm font-medium transition hover:bg-purple-400"
        >
          Quiz me
        </button>

      </div>

    </aside>
  );
}