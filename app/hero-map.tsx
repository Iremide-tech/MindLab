"use client";

import { useState } from "react";

type Node = {
  id: string;
  title: string;
  hint: string;
  x: number; // centre, % of canvas width
  y: number; // centre, % of canvas height
  parent?: string;
  deeper?: string; // id of the idea "Explore deeper" reveals
  tone?: "root" | "copper";
  detail: string;
  links: string[];
};

const NODES: Node[] = [
  {
    id: "climate",
    title: "Climate systems",
    hint: "How Earth stays in balance",
    x: 50,
    y: 14,
    tone: "root",
    detail:
      "Oceans, air, ice and living things exchange heat and carbon. Change one and the others respond.",
    links: ["Ocean currents", "Carbon cycle"],
  },
  {
    id: "ocean",
    title: "Ocean currents",
    hint: "Move heat around the planet",
    x: 21,
    y: 50,
    parent: "climate",
    deeper: "thermo",
    detail:
      "Surface winds and density differences push water around the globe, carrying heat from the tropics toward the poles.",
    links: ["Climate systems"],
  },
  {
    id: "carbon",
    title: "Carbon cycle",
    hint: "Exchange across Earth systems",
    x: 79,
    y: 50,
    parent: "climate",
    deeper: "permafrost",
    detail:
      "Carbon moves between the atmosphere, oceans, soil and living things. Small shifts in each store add up over decades.",
    links: ["Climate systems"],
  },
  {
    id: "thermo",
    title: "Thermohaline circulation",
    hint: "A deep-ocean current system",
    x: 21,
    y: 86,
    parent: "ocean",
    tone: "copper",
    detail:
      "Differences in water temperature and salinity drive deep ocean currents, moving heat and nutrients across the globe.",
    links: ["Ocean currents", "Climate regulation"],
  },
  {
    id: "permafrost",
    title: "Permafrost thaw",
    hint: "Frozen carbon, released",
    x: 79,
    y: 86,
    parent: "carbon",
    tone: "copper",
    detail:
      "Warming soil in the Arctic releases carbon that has been locked away for thousands of years.",
    links: ["Carbon cycle"],
  },
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

export default function HeroMap() {
  const [visible, setVisible] = useState<string[]>(["climate", "ocean", "carbon"]);
  const [selectedId, setSelectedId] = useState("ocean");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const selected = byId[selectedId];
  const next = selected.deeper;
  const canExplore = !!next && !visible.includes(next);

  function exploreDeeper() {
    if (!next || !canExplore) return;
    setVisible((v) => [...v, next]);
    setSelectedId(next);
    setJustAdded(next);
  }

  const shown = NODES.filter((n) => visible.includes(n.id));

  return (
    <div className="overflow-hidden border border-white/20 bg-[#0b0c0a] font-mono">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center border border-lab-lime/50 bg-lab-lime/10 text-xs text-lab-lime"
        >
          ML
        </span>
        <div>
          <p className="text-sm font-medium">Climate systems</p>
          <p className="text-xs text-white/55">Research workspace</p>
        </div>
        <p className="ml-auto text-xs text-lab-lime" aria-live="polite">
          {visible.length - 1} connected ideas
        </p>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="relative h-80 overflow-hidden border border-white/20 bg-[#000] sm:h-96">
            <div className="map-grid absolute inset-0 bg-[radial-gradient(#596357_0.7px,transparent_0.7px)] bg-size-[18px_18px] opacity-35" />

            {/* Lines share the same percentage coordinate space as the nodes,
                so they stay attached at every width. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {shown
                .filter((n) => n.parent)
                .map((n) => {
                  const p = byId[n.parent!];
                  const midY = (p.y + n.y) / 2;
                  return (
                    <path
                      key={n.id}
                      d={`M${p.x} ${p.y} V${midY} H${n.x} V${n.y}`}
                      fill="none"
                      stroke={n.id === selectedId ? "var(--lab-lime)" : "#68745f"}
                      strokeOpacity={n.id === selectedId ? 0.9 : 0.7}
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      className="map-line"
                    />
                  );
                })}
            </svg>

            {shown.map((n) => {
              const active = n.id === selectedId;
              const tone =
                n.tone === "root"
                  ? "border-lab-lime/50 bg-[#0b0c0a]"
                  : n.tone === "copper"
                    ? "border-lab-lime/50 bg-[#0b0c0a]"
                    : "border-white/20 bg-[#0b0c0a]";
              return (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(n.id)}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  className={`absolute w-[40%] -translate-x-1/2 -translate-y-1/2 border px-2 py-2.5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-lime sm:w-[34%] sm:px-4 ${tone} ${
                    active ? "ring-1 ring-lab-lime" : "hover:border-white/25"
                  } ${justAdded === n.id ? "node-in" : ""} map-node`}
                >
                  <span className="block text-xs font-medium sm:text-sm">{n.title}</span>
                  <span className="mt-0.5 hidden text-xs text-white/55 sm:block">{n.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-white/10 p-5 sm:p-6 md:border-l md:border-t-0">
          <p className="text-sm font-medium text-lab-lime">AI summary</p>
          <h2 className="mt-4 text-lg font-semibold leading-snug">{selected.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">{selected.detail}</p>
          <div className="mt-5 border border-white/20 bg-[#000] p-3.5">
            <p className="text-xs text-white/55">Connected to</p>
            <p className="mt-2 text-sm text-white/80">{selected.links.join(", ")}</p>
          </div>
          <button
            type="button"
            onClick={exploreDeeper}
            disabled={!canExplore}
            className="mt-5 w-full border border-lab-lime/50 bg-lab-lime/10 px-4 py-2.5 text-sm font-medium text-lab-lime-soft transition hover:bg-lab-lime/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-lime disabled:cursor-default disabled:border-white/20 disabled:bg-transparent disabled:text-white/45"
          >
            {canExplore ? "Add a related idea" : "Nothing more to add here"}
          </button>
        </aside>
      </div>
    </div>
  );
}
