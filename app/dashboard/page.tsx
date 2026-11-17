"use client";

import { useRouter } from "next/navigation";
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
import BillingSummary from "@/components/BillingSummary";
import type { MindMapNode } from "@/lib/mindmap";
import { createClient } from "@/lib/supabase/client";

type SavedResearchMap = {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
};

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient) supabaseClient = createClient();
  return supabaseClient;
}

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedForConnection, setSelectedForConnection] = useState<Node[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [mapTitle, setMapTitle] = useState("Untitled research map");
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapOwnerId, setCurrentMapOwnerId] = useState<string | null>(null);
  const [leavingMap, setLeavingMap] = useState(false);
  const [showSavedMaps, setShowSavedMaps] = useState(false);
  const [savedMaps, setSavedMaps] = useState<SavedResearchMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(user.id);
      setUserEmail(user.email ?? null);

      const requestedMapId = new URLSearchParams(window.location.search).get("map");
      if (requestedMapId) {
        const { data: requestedMap, error } = await getSupabase()
          .from("research_maps")
          .select("id, user_id, title, nodes, edges")
          .eq("id", requestedMapId)
          .maybeSingle();
        if (requestedMap && !error) {
          setNodes(requestedMap.nodes ?? []);
          setEdges(requestedMap.edges ?? []);
          setMapTitle(requestedMap.title ?? "Untitled research map");
          setCurrentMapId(requestedMap.id);
          setCurrentMapOwnerId(requestedMap.user_id);
        }
      }
    };
    void loadUser();
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.replace("/login");
      else {
        setCurrentUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, [router, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    if (connectMode) {
      setSelectedForConnection((current) => {
        if (current.some((item) => item.id === node.id)) {
          return current.filter((item) => item.id !== node.id);
        }
        if (current.length >= 2) return current;
        return [...current, node];
      });
      return;
    }
    setSelectedNode({
      id: node.id,
      label: String(node.data.label),
      description: node.data.description ? String(node.data.description) : undefined,
    });
  }

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: submittedTopic }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API request failed with ${response.status}`);
      }
      const data = await response.json();
      const topicId =
        submittedTopic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `topic-${Date.now()}`;
      const rightmostNodeX = nodes.reduce(
        (rightmost, existingNode) => Math.max(rightmost, existingNode.position.x),
        Number.NEGATIVE_INFINITY
      );
      const centerX = Number.isFinite(rightmostNodeX) ? rightmostNodeX + 620 : 0;
      const generatedNodes: Node[] = data.nodes.map(
        (node: { id: string; label: string; description?: string }, index: number) => {
          const isRoot = index === 0;
          const conceptIndex = index - 1;
          const angle = (conceptIndex / Math.max(data.nodes.length - 1, 1)) * Math.PI * 2;
          const radius = 280;
          return {
            id: `${topicId}-${node.id}`,
            position: {
              x: isRoot ? centerX : centerX + Math.cos(angle) * radius,
              y: isRoot ? 450 : 450 + Math.sin(angle) * radius,
            },
            data: { label: node.label, description: node.description },
            style: {
              background: isRoot ? "#24103d" : "#18181b",
              color: "#ffffff",
              border: isRoot
                ? "1px solid rgba(192, 132, 252, 0.9)"
                : "1px solid rgba(168, 85, 247, 0.5)",
              borderRadius: "14px",
              padding: "12px 16px",
              fontSize: isRoot ? "15px" : "14px",
              fontWeight: isRoot ? 700 : 500,
            },
          };
        }
      );
      const generatedEdges: Edge[] = data.edges.map(
        (edge: { id: string; source: string; target: string }) => ({
          id: `${topicId}-${edge.id}`,
          source: `${topicId}-${edge.source}`,
          target: `${topicId}-${edge.target}`,
        })
      );
      setNodes((current) => [...current, ...generatedNodes]);
      setEdges((current) => [...current, ...generatedEdges]);
      setTopic("");
    } catch (error) {
      console.error("Mind map error:", error);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: selectedNode.label,
          description: selectedNode.description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to expand concept");
      const parent = nodes.find((node) => node.id === selectedNode.id);
      if (!parent) return;
      const expansionTime = Date.now();
      const radius = 280;
      const concepts = data.concepts || [];
      const newNodes: Node[] = concepts.map(
        (concept: { id: string; label: string; description: string }, index: number) => {
          const angle = (index / Math.max(concepts.length, 1)) * Math.PI * 2;
          return {
            id: `expanded-${parent.id}-${expansionTime}-${index}`,
            position: {
              x: parent.position.x + Math.cos(angle) * radius,
              y: parent.position.y + Math.sin(angle) * radius,
            },
            data: { label: concept.label, description: concept.description },
            style: {
              background: "#18181b",
              color: "#ffffff",
              border: "1px solid rgba(168, 85, 247, 0.5)",
              borderRadius: "14px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 500,
            },
          };
        }
      );
      const newEdges: Edge[] = newNodes.map((newNode, index) => ({
        id: `expansion-${parent.id}-${expansionTime}-${index}`,
        source: parent.id,
        target: newNode.id,
        animated: true,
        style: { stroke: "rgba(168, 85, 247, 0.55)", strokeWidth: 1.5 },
      }));
      setNodes((current) => [...current, ...newNodes]);
      setEdges((current) => [...current, ...newEdges]);
    } catch (error) {
      console.error("Expansion error:", error);
    } finally {
      setExpanding(false);
    }
  }

  async function saveCurrentMap() {
    if (nodes.length === 0) {
      setSaveMessage("Generate a map first.");
      return false;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) {
        setSaveMessage("Please log in again.");
        return false;
      }
      const mapData = {
        title: mapTitle || "Untitled research map",
        nodes,
        edges,
      };
      if (currentMapId) {
        const { error } = await getSupabase()
          .from("research_maps")
          .update(mapData)
          .eq("id", currentMapId);
        if (error) throw error;
        setSaveMessage("Workspace updated.");
      } else {
        const { data, error } = await getSupabase()
          .from("research_maps")
          .insert({ ...mapData, user_id: user.id })
          .select("id, user_id")
          .single();
        if (error) throw error;
        setCurrentMapId(data.id);
        setCurrentMapOwnerId(data.user_id);
        setSaveMessage("Workspace saved.");
      }
      return true;
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage("Could not save workspace.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function leaveCurrentMap() {
    if (!currentMapId || !currentUserId || currentMapOwnerId === currentUserId) return;

    if (nodes.length > 0) {
      const choice = window.confirm(
        "Save your changes before leaving this shared map?\n\nOK = Save then leave\nCancel = Leave without saving"
      );
      if (choice) {
        const saved = await saveCurrentMap();
        if (!saved) {
          const force = window.confirm("Save failed. Leave anyway without saving?");
          if (!force) return;
        }
      }
    } else if (
      !window.confirm("Leave this shared map? You will no longer be able to access it.")
    ) {
      return;
    }

    setLeavingMap(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/maps/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId: currentMapId }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Unable to leave this map.");
      setCurrentMapId(null);
      setCurrentMapOwnerId(null);
      setNodes([]);
      setEdges([]);
      setMapTitle("Untitled research map");
      setSelectedNode(null);
      setMenuOpen(false);
      setSaveMessage("You left the map.");
    } catch (error) {
      console.error("Leave error:", error);
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to leave this map."
      );
    } finally {
      setLeavingMap(false);
    }
  }

  async function loadSavedMaps() {
    setLoadingMaps(true);
    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    if (!user) {
      setLoadingMaps(false);
      return;
    }
    const { data, error } = await getSupabase()
      .from("research_maps")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to load maps:", error.message);
    else setSavedMaps((data as SavedResearchMap[]) ?? []);
    setLoadingMaps(false);
  }

  function openSavedMap(map: SavedResearchMap) {
    setNodes(map.nodes ?? []);
    setEdges(map.edges ?? []);
    setMapTitle(map.title ?? "Untitled research map");
    setCurrentMapId(map.id);
    setCurrentMapOwnerId(map.user_id);
    setShowSavedMaps(false);
    setMenuOpen(false);
    setSelectedNode(null);
  }

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }

  const isCollaborator = Boolean(
    currentMapId && currentUserId && currentMapOwnerId && currentMapOwnerId !== currentUserId
  );

  const menuItems = (
    <>
      <button
        type="button"
        onClick={() => {
          void saveCurrentMap();
          setMenuOpen(false);
        }}
        disabled={saving || nodes.length === 0}
        className="flex w-full items-center justify-between rounded-xl border border-lab-copper/20 bg-lab-copper/10 px-4 py-3 text-left text-sm font-medium text-lab-copper disabled:opacity-40"
      >
        <span>{saving ? "Saving…" : "Save map"}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setShowSavedMaps(true);
          void loadSavedMaps();
          setMenuOpen(false);
        }}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium"
      >
        Saved maps
      </button>

      <button
        type="button"
        onClick={() => {
          setConnectMode((c) => !c);
          setSelectedForConnection([]);
          setSelectedNode(null);
          setMenuOpen(false);
        }}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium ${
          connectMode
            ? "border-lab-lime bg-lab-lime/20 text-lab-lime-light"
            : "border-white/10 bg-white/5"
        }`}
      >
        {connectMode ? "Exit connect mode" : "Connect topics"}
      </button>

      {isCollaborator ? (
        <button
          type="button"
          onClick={() => void leaveCurrentMap()}
          disabled={leavingMap}
          className="flex w-full items-center justify-between rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-300 disabled:opacity-50"
        >
          {leavingMap ? "Leaving…" : "Leave map"}
        </button>
      ) : null}

      <div className="border-t border-white/10 pt-3">
        <div className="mb-3 px-1">
          <BillingSummary />
        </div>
        {userEmail ? (
          <p className="mb-3 truncate px-1 text-xs text-white/40">{userEmail}</p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-between rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-300"
        >
          Log out
        </button>
      </div>
    </>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
      <header className="absolute left-0 right-0 top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 shrink-0">
            <h1 className="text-lg font-bold tracking-[-0.03em] sm:text-xl">
              MindLab<span className="text-lab-lime">AI</span>
            </h1>
          </div>

          <form onSubmit={generateMindMap} className="flex min-w-0 flex-1 items-center gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Add a topic…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-lab-lime/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-10 shrink-0 rounded-xl bg-lab-lime px-3 py-2 text-sm font-semibold text-lab-ink disabled:opacity-50"
            >
              {loading ? "…" : "Add"}
            </button>
          </form>

          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => {
                setConnectMode((c) => !c);
                setSelectedForConnection([]);
                setSelectedNode(null);
              }}
              className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-medium ${
                connectMode
                  ? "border-lab-lime bg-lab-lime/20 text-lab-lime-light"
                  : "border-white/10 bg-white/5"
              }`}
            >
              Connect
              {selectedForConnection.length > 0
                ? ` (${selectedForConnection.length}/2)`
                : ""}
            </button>
            <button
              type="button"
              onClick={() => void saveCurrentMap()}
              disabled={saving || nodes.length === 0}
              className="min-h-10 rounded-xl border border-lab-copper/20 bg-lab-copper/10 px-3 py-2 text-sm font-medium text-lab-copper disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSavedMaps(true);
                void loadSavedMaps();
              }}
              className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium"
            >
              Saved
            </button>
            {isCollaborator ? (
              <button
                type="button"
                onClick={() => void leaveCurrentMap()}
                disabled={leavingMap}
                className="min-h-10 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 disabled:opacity-50"
              >
                {leavingMap ? "Leaving…" : "Leave map"}
              </button>
            ) : null}
            <BillingSummary />
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-10 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-xs text-red-300"
            >
              Log out
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span
              className={`block h-0.5 w-5 bg-white transition ${
                menuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition ${\n                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition ${
                menuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>

        {saveMessage ? (
          <p className="border-t border-white/5 px-3 py-1.5 text-xs text-white/55 sm:px-4">
            {saveMessage}
          </p>
        ) : null}

        {menuOpen ? (
          <div className="border-t border-white/10 bg-background/98 px-3 py-3 lg:hidden">
            <div className="mx-auto flex max-w-lg flex-col gap-2">{menuItems}</div>
          </div>
        ) : null}
      </header>

      <div className={`h-full w-full ${menuOpen ? "pt-72" : "pt-16"} lg:pt-[68px]`}>
        <MindMap
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
        />
      </div>

      <KnowledgePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onExpand={expandConcept}
        expanding={expanding}
      />

      {showSavedMaps ? (
        <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm">
          <div className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-lab-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Saved maps</h2>
              <button
                type="button"
                onClick={() => setShowSavedMaps(false)}
                className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            {loadingMaps ? (
              <p className="text-sm text-white/45">Loading…</p>
            ) : savedMaps.length === 0 ? (
              <p className="text-sm text-white/45">No saved maps yet.</p>
            ) : (
              <ul className="space-y-2">
                {savedMaps.map((map) => (
                  <li key={map.id}>
                    <button
                      type="button"
                      onClick={() => openSavedMap(map)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10"
                    >
                      <p className="truncate text-sm font-medium">{map.title}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {new Date(map.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
