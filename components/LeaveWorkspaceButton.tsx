"use client";

type Props = {
  leaving?: boolean;
  variant?: "menu" | "header";
  onLeave: () => void;
};

export default function LeaveWorkspaceButton({
  leaving = false,
  variant = "header",
  onLeave,
}: Props) {
  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={onLeave}
        disabled={leaving}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/90 disabled:opacity-50"
      >
        {leaving ? "Leaving…" : "Leave workspace"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLeave}
      disabled={leaving}
      className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium disabled:opacity-50"
    >
      {leaving ? "Leaving…" : "Leave"}
    </button>
  );
}
