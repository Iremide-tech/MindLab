"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import MindMap from "@/components/Mindmap";
import KnowledgePanel from "@/components/KnowledgePanel";

import type { MindMapNode } from "@/lib/mindmap";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Keeps track of how many research topics have been added.
  // Each topic gets its own area on the canvas.
  const [topicCount, setTopicCount] = useState(0);

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>([]);

  // Currently inspected concept
  const [selectedNode, setSelectedNode] =
    useState<MindMapNode | null>(null);

  // --------------------------------------------------
  // Connection mode
  // --------------------------------------------------

  const [connectMode, setConnectMode] = useState(false);

  const [selectedForConnection, setSelectedForConnection] =
    useState<Node[]>([]);

  const [connectionExplanation, setConnectionExplanation] =
    useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [expanding, setExpanding] = useState(false);

  const [saving, setSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState<string | null>(null);
const [mapTitle, setMapTitle] = useState("Untitled research map");

const [savedMaps, setSavedMaps] = useState<any[]>([]);
const [loadingMaps, setLoadingMaps] = useState(false);
const [showSavedMaps, setShowSavedMaps] = useState(false);

   
useEffect(() => {
  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(user.email ?? null);
  };

  loadUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(session.user.email ?? null);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(connection, currentEdges)
      );
    },
    [setEdges]
  );

  // --------------------------------------------------
  // Node click
  // --------------------------------------------------

  function handleNodeClick(
    _: React.MouseEvent,
    node: Node
  ) {
    // Connection mode
    if (connectMode) {
      setSelectedForConnection((current) => {
        // Clicking an already-selected node removes it.
        if (
          current.some(
            (item) => item.id === node.id
          )
        ) {
          return current.filter(
            (item) => item.id !== node.id
          );
        }

        // Only allow two nodes.
        if (current.length >= 2) {
          return current;
        }

        return [...current, node];
      });
      

      return;
    }

    // Normal node inspection
    setSelectedNode({
      id: node.id,
      label: String(node.data.label),
      description: node.data.description
        ? String(node.data.description)
        : undefined,
    });
  }

  // --------------------------------------------------
  // Generate a new research topic
  // --------------------------------------------------

  async function generateMindMap(e?: FormEvent) {
    e?.preventDefault();
const submittedTopic = topic.trim();

if (!submittedTopic) return;

setLoading(true);
setMapTitle(submittedTopic);
    setSelectedNode(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  topic: submittedTopic,
}),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.error ||
            `API request failed with ${response.status}`
        );
      }

      const data = await response.json();

      // --------------------------------------------------
      // Create a unique namespace for this topic
      // --------------------------------------------------

     const topicId =
  submittedTopic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") ||
  `topic-${Date.now()}`;

      // Save the current topic's position.
      const currentTopicIndex = topicCount;

    
      const generatedNodes: Node[] =
        data.nodes.map(
          (
            node: {
              id: string;
              label: string;
              description?: string;
            },
            index: number
          ) => {
            const centerX =
              currentTopicIndex * 900;

            const centerY = 450;

            const isRoot = index === 0;

            const conceptIndex = index - 1;

            const angle =
              (conceptIndex /
                Math.max(
                  data.nodes.length - 1,
                  1
                )) *
              Math.PI *
              2;

            const radius = 280;

            return {
              id: `${topicId}-${node.id}`,

              position: {
                x: isRoot
                  ? centerX
                  : centerX +
                    Math.cos(angle) *
                      radius,

                y: isRoot
                  ? centerY
                  : centerY +
                    Math.sin(angle) *
                      radius,
              },

              data: {
                label: node.label,
                description:
                  node.description,
              },

              style: {
                background: isRoot
                  ? "#24103d"
                  : "#18181b",

                color: "#ffffff",

                border: isRoot
                  ? "1px solid rgba(192, 132, 252, 0.9)"
                  : "1px solid rgba(168, 85, 247, 0.5)",

                borderRadius: "14px",

                padding: "12px 16px",

                boxShadow: isRoot
                  ? "0 0 35px rgba(168, 85, 247, 0.35)"
                  : "0 0 20px rgba(168, 85, 247, 0.15)",

                fontSize: isRoot
                  ? "15px"
                  : "14px",

                fontWeight: isRoot
                  ? 700
                  : 500,
              },
            };
          }
        );

     

      const generatedEdges: Edge[] =
        data.edges.map(
          (
            edge: {
              id: string;
              source: string;
              target: string;
            }
          ) => ({
            id: `${topicId}-${edge.id}`,

            source: `${topicId}-${edge.source}`,

            target: `${topicId}-${edge.target}`,
          })
        );

    

      setNodes((currentNodes) => [
        ...currentNodes,
        ...generatedNodes,
      ]);

      setEdges((currentEdges) => [
        ...currentEdges,
        ...generatedEdges,
      ]);

      // Move to the next topic region.
      setTopicCount(
        (current) => current + 1
      );

      // Clear input
      setTopic("");
    } catch (error) {
      console.error(
        "Mind map error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }



 async function expandConcept() {
  if (!selectedNode) return;

  setExpanding(true);

  try {
    const response = await fetch("/api/expand", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: selectedNode.label,
        description: selectedNode.description,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to expand concept"
      );
    }

    const parent = nodes.find(
      (node) => node.id === selectedNode.id
    );

    if (!parent) return;

    const normalizeLabel = (label: string) =>
      label.trim().toLowerCase().replace(/\s+/g, " ");

    // Track all existing concepts
    const existingLabels = new Set(
      nodes.map((node) =>
        normalizeLabel(String(node.data.label))
      )
    );

    // Remove duplicates from Gemini's response
    const uniqueConcepts = (data.concepts || []).filter(
      (concept: {
        id: string;
        label: string;
        description: string;
      }) => {
        const normalizedLabel = normalizeLabel(
          concept.label
        );

        if (
          !normalizedLabel ||
          existingLabels.has(normalizedLabel)
        ) {
          return false;
        }

        // Prevent duplicates in the same response
        existingLabels.add(normalizedLabel);

        return true;
      }
    );

    if (uniqueConcepts.length === 0) {
      console.log("No new concepts found.");
      return;
    }

    const expansionTime = Date.now();
   const radius = 280;

// Count existing nodes connected to this parent
const existingChildren = edges.filter(
  (edge) => edge.source === parent.id
).length;

// Start new nodes after existing children
const startAngle =
  (existingChildren * Math.PI) / 4;

    const newNodes: Node[] = uniqueConcepts.map(
      (
        concept: {
          id: string;
          label: string;
          description: string;
        },
        index: number
      ) => {
        const angle =
  startAngle +
  (index / uniqueConcepts.length) *
    Math.PI *
    2;

        return {
          id: `expanded-${parent.id}-${expansionTime}-${index}`,

          position: {
            x:
              parent.position.x +
              Math.cos(angle) * radius,

            y:
              parent.position.y +
              Math.sin(angle) * radius,
          },

          data: {
            label: concept.label,
            description: concept.description,
          },

          style: {
            background: "#18181b",
            color: "#ffffff",
            border:
              "1px solid rgba(168, 85, 247, 0.5)",
            borderRadius: "14px",
            padding: "12px 16px",
            boxShadow:
              "0 0 20px rgba(168, 85, 247, 0.15)",
            fontSize: "14px",
            fontWeight: 500,
          },
        };
      }
    );

    const newEdges: Edge[] = newNodes.map(
      (newNode, index) => ({
        id: `expansion-${parent.id}-${expansionTime}-${index}`,
        source: parent.id,
        target: newNode.id,
        animated: true,

        style: {
          stroke: "rgba(168, 85, 247, 0.55)",
          strokeWidth: 1.5,
        },
      })
    );

    setNodes((currentNodes) => [
      ...currentNodes,
      ...newNodes,
    ]);

    setEdges((currentEdges) => [
      ...currentEdges,
      ...newEdges,
    ]);

    console.log(
      `Added ${uniqueConcepts.length} new concepts.`
    );
  } catch (error) {
    console.error("Expansion error:", error);
  } finally {
    setExpanding(false);
  }
}
  async function connectTopics() {
    if (
      selectedForConnection.length !== 2
    ) {
      return;
    }

    setConnecting(true);
    setConnectionExplanation(null);

    const [first, second] =
      selectedForConnection;

    try {
      const response = await fetch(
        "/api/connect",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            topicA: {
              id: first.id,
              label: first.data.label,
              description:
                first.data.description,
            },

            topicB: {
              id: second.id,
              label: second.data.label,
              description:
                second.data.description,
            },
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to connect topics"
        );
      }

      // --------------------------------------------------
      // Add AI-generated relationships
      // --------------------------------------------------

      const newEdges: Edge[] =
        data.connections.map(
          (
            connection: {
              source: string;
              target: string;
              label: string;
            },
            index: number
          ) => ({
            id:
              `connection-${Date.now()}-${index}`,

            source: connection.source,

            target: connection.target,

            label: connection.label,

            animated: true,

            style: {
              stroke: "#a855f7",
              strokeWidth: 2,
            },

            labelStyle: {
              fill: "#c084fc",
              fontSize: 12,
            },

            labelBgStyle: {
              fill: "#09090b",
              fillOpacity: 0.9,
            },
          })
        );

      setEdges((currentEdges) => [
        ...currentEdges,
        ...newEdges,
      ]);

      // --------------------------------------------------
      // Show Gemini's explanation
      // --------------------------------------------------

      setConnectionExplanation(
        data.summary
      );

      // Reset connection mode
      setSelectedForConnection([]);
      setConnectMode(false);
    } catch (error) {
      console.error(
        "Connection error:",
        error
      );

      setConnectionExplanation(
        "I couldn't find the connection right now."
      );
    } finally {
      setConnecting(false);
    }
  }

  // --------------------------------------------------
  // Toggle connection mode
  // --------------------------------------------------

  function toggleConnectMode() {
    setConnectMode(
      (current) => !current
    );

    setSelectedForConnection([]);
    setConnectionExplanation(null);
    setSelectedNode(null);
  }

 
async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    return;
  }

  window.location.href = "/login";
}


async function saveCurrentMap() {
  if (nodes.length === 0) {
    setSaveMessage("Generate a map first.");
    return;
  }

  setSaving(true);
  setSaveMessage(null);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setSaveMessage("Please log in again.");
    setSaving(false);
    return;
  }

  const { error } = await supabase
    .from("research_maps")
    .insert({
      user_id: user.id,
      title: mapTitle,
      nodes,
      edges,
    });

  if (error) {
    console.error("Save failed:", error.message);
    setSaveMessage("Could not save your map.");
  } else {
    setSaveMessage("Map saved successfully.");
  }

  setSaving(false);
}

function openSavedMap(map: any) {
  setNodes(map.nodes ?? []);
  setEdges(map.edges ?? []);
  setMapTitle(map.title ?? "Untitled research map");
  setShowSavedMaps(false);
  setSelectedNode(null);
}

async function loadSavedMaps() {
  setLoadingMaps(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setLoadingMaps(false);
    return;
  }

  const { data, error } = await supabase
    .from("research_maps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load maps:", error.message);
  } else {
    setSavedMaps(data ?? []);
  }

  setLoadingMaps(false);
}

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">

      {/* HEADER */}

      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/70 px-6 py-4 backdrop-blur-xl">

        {/* Logo */}

        <div>
          <h1 className="text-xl font-bold tracking-tight">
            MindLab
            <span className="text-purple-400">
              AI
            </span>
          </h1>

          <p className="text-xs text-white/40">
            Turn thoughts into knowledge
          </p>
        </div>

        {/* Controls */}

        <div className="flex items-center gap-2">


         {saveMessage && (
  <p className="text-xs text-white/60">
    {saveMessage}
  </p>
)}
          {/* Topic input */}

          <form
            onSubmit={generateMindMap}
            className="flex gap-2"
          >
            <input
              value={topic}
              onChange={(e) =>
                setTopic(e.target.value)
              }
              placeholder="Add a research topic..."
              className="w-80 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-purple-400/50 focus:bg-white/10"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-purple-500 px-5 py-2 text-sm font-medium transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Thinking..."
                : "Add Topic"}
            </button>
          </form>

          {/* Connect button */}

          <button
            type="button"
            onClick={toggleConnectMode}
            className={`rounded-xl border px-5 py-2 text-sm font-medium transition ${
              connectMode
                ? "border-purple-400 bg-purple-500/20 text-purple-300"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            Connect
          </button>

          
<button
  type="button"
  onClick={() => {
    setShowSavedMaps(true);
    loadSavedMaps();
  }}
  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium transition hover:bg-white/10"
>
  Saved Maps
</button>

          
<button
  type="button"
  onClick={saveCurrentMap}
  disabled={saving || nodes.length === 0}
  className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
>
  {saving ? "Saving..." : "Save Map"}
</button>

        </div>
        
{userEmail && (
  <span className="hidden max-w-52 truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 sm:block">
    {userEmail}
  </span>
)}

<button
  onClick={handleLogout}
  className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
>
  Log out
</button>
      </header>

      {/* CONNECTION MODE */}

      {connectMode && (
        <div className="absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-2xl border border-purple-400/20 bg-zinc-950/90 px-6 py-4 text-center shadow-2xl backdrop-blur-xl">

          <p className="text-sm text-white/70">
            Select two concepts
            to connect
          </p>

          <p className="mt-1 text-xs text-purple-400">
            {selectedForConnection.length}
            /2 selected
          </p>

          {selectedForConnection.length ===
            2 && (
            <button
              onClick={connectTopics}
              disabled={connecting}
              className="mt-3 w-full rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting
                ? "Analyzing..."
                : "Connect Concepts"}
            </button>
          )}

        </div>
      )}

    

      {connectionExplanation && (
        <div className="absolute bottom-6 left-1/2 z-40 w-[420px] -translate-x-1/2 rounded-2xl border border-purple-400/20 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl">

          <div className="mb-2 flex items-center gap-2">

            <span className="text-purple-400">
              ✦
            </span>

            <span className="text-xs font-medium uppercase tracking-widest text-purple-400">
              Connection Explanation
            </span>

          </div>

          <p className="text-sm leading-6 text-white/70">
            {connectionExplanation}
          </p>

          <button
            onClick={() =>
              setConnectionExplanation(null)
            }
            className="mt-4 text-xs text-white/40 transition hover:text-white"
          >
            Dismiss
          </button>

        </div>
      )}

      
{showSavedMaps && (
  <div className="absolute right-6 top-24 z-50 w-80 rounded-2xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-semibold">Saved Maps</h2>

      <button
        type="button"
        onClick={() => setShowSavedMaps(false)}
        className="text-white/40 hover:text-white"
      >
        ✕
      </button>
    </div>

    {loadingMaps ? (
      <p className="text-sm text-white/50">
        Loading maps...
      </p>
    ) : savedMaps.length === 0 ? (
      <p className="text-sm text-white/50">
        No saved maps yet.
      </p>
    ) : (
      <div className="space-y-2">
        {savedMaps.map((map) => (
          <button
            key={map.id}
            type="button"
            onClick={() => openSavedMap(map)}
            className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-purple-500/10"
          >
            <p className="text-sm font-medium text-white">
              {map.title}
            </p>

            <p className="mt-1 text-xs text-white/40">
              {new Date(map.created_at).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    )}
  </div>
)}

      {/* CANVAS */}

      <div className="h-full w-full pt-[73px]">

        <MindMap
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
        />

      </div>

      {/* KNOWLEDGE PANEL */}

     <KnowledgePanel
  node={selectedNode}
  onClose={() => setSelectedNode(null)}
  onExpand={expandConcept}
  expanding={expanding}
/>

    </main>
  );
}