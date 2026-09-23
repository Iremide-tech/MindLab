"use client";

type NodeCardProps = {
  label: string;
  isRoot?: boolean;
};

export default function NodeCard({
  label,
  isRoot = false,
}: NodeCardProps) {
  return (
    <div
      className={`rounded-xl border px-5 py-3 text-center backdrop-blur-xl ${
        isRoot
          ? "border-purple-400/80 bg-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.35)]"
          : "border-purple-400/30 bg-zinc-900/90 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
      }`}
    >
      <span className="text-sm font-medium text-white">
        {label}
      </span>
    </div>
  );
}