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
  MarkerType,
} from "@xyflow/react";
import MindMap from "@/components/Mindmap";
import KnowledgePanel from "@/components/KnowledgePanel";
import BillingSummary from "@/components/BillingSummary";
import NoteImportModal from "@/components/NoteImportModal";
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

type ConnectionSuggestion = {
  source: string;
  target: string;
  label: string;
  explanation: string;
};

type ConnectionAnalysis = {
  connections: ConnectionSuggestion[];
  summary: string;
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
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAnalysis, setConnectionAnalysis] = useState<ConnectionAnalysis | null>(null);
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
  const [showImport, setShowImport] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

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
      try {
        const planRes = await fetch("/api/payments/status", { cache: "no-store" });
        if (planRes.ok) {
          const planData = (await planRes.json()) as { planName?: string };
          const name = (planData.planName || "").toLowerCase();
          setIsPaid(name === "student" || name === "research");
        }
      } catch {
        setIsPaid(false);
      }

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

  async function analyzeConnection(first: Node, second: Node) {
    setConnectionLoading(true);
    setConnectionError(null);
    setConnectionAnalysis(null);
    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicA: {
            id: first.id,
            label: String(first.data.label ?? ""),
            description: first.data.description ? String(first.data.description) : undefined,
          },
          topicB: {
            id: second.id,
            label: String(second.data.label ?? ""),
            description: second.data.description ? String(second.data.description) : undefined,
          },
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (ConnectionAnalysis & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "Could not analyse these topics. Please try again.");
      }
      if (!data || !Array.isArray(data.connections) || typeof data.summary !== "string") {
        throw new Error("The AI returned an unexpected connection response.");
      }
      const validConnections = data.connections.filter(
        (connection) =>
          connection &&
          connection.source === first.id &&
          connection.target === second.id &&
          typeof connection.label === "string" &&
          typeof connection.explanation === "string"
      );
      setConnectionAnalysis({ connections: validConnections, summary: data.summary });
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Could not analyse these topics.");
    } finally {
      setConnectionLoading(false);
    }
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    if (connectMode) {
      if (selectedForConnection.some((item) => item.id === node.id)) {
        setSelectedForConnection((current) => current.filter((item) => item.id !== node.id));
        return;
      }
      if (selectedForConnection.length >= 2 || connectionLoading) return;
      const nextSelection = [...selectedForConnection, node];
      setSelectedForConnection(nextSelection);
      if (nextSelection.length === 2) {
        setConnectMode(false);
        void analyzeConnection(nextSelection[0], nextSelection[1]);
      }
      return;
    }
    setSelectedNode({
      id: node.id,
      label: String(node.data.label),
      description: node.data.description ? String(node.data.description) : undefined,
    });
  }

  function addSuggestedConnection(connection: ConnectionSuggestion) {
    const alreadyExists = edges.some(
      (edge) =>
        (edge.source === connection.source && edge.target === connection.target) ||
        (edge.source === connection.target && edge.target === connection.source)
    );
    if (alreadyExists) {
      setConnectionError("These topics are already connected in your map.");
      return;
    }
    setEdges((current) => [
      ...current,
      {
        id: `ai-connection-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        label: connection.label,
        labelShowBg: true,
        labelBgStyle: { fill: "#171b12", fillOpacity: 0.96 },
        labelBgPadding: [8, 5] as [number, number],
        labelBgBorderRadius: 6,
        labelStyle: { fill: "#e5f5bd", fontSize: 12, fontWeight: 600 },
        animated: true,
        style: { stroke: "#c8f169", strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#c8f169", width: 18, height: 18 },
      },
    ]);
    setConnectionAnalysis((current) =>
      current
        ? {
            ...current,
            connections: current.connections.filter(
              (item) => item.source !== connection.source || item.target !== connection.target
            ),
          }
        : current
    );
  }

  function closeConnectionAnalysis() {
    setConnectionAnalysis(null);
    setConnectionError(null);
    setSelectedForConnection([]);
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
        body: JSON.stringify({ topic: submittedTopic, mapId: currentMapId }),
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
      setSaveMessage(error instanceof Error ? error.message : "Generation failed.");
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

  function handleImportedMap(payload: {
    title: string;
    nodes: Array<{ id: string; label: string; description?: string }>;
    edges: Array<{ id: string; source: string; target: string }>;
  }) {
    const baseTitle = payload.title || "Imported notes";
    setMapTitle(baseTitle);
    const topicId =
      baseTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `notes-${Date.now()}`;
    const rightmostNodeX = nodes.reduce(
      (rightmost, existingNode) => Math.max(rightmost, existingNode.position.x),
      Number.NEGATIVE_INFINITY
    );
    const centerX = Number.isFinite(rightmostNodeX) ? rightmostNodeX + 620 : 0;
    const generatedNodes = payload.nodes.map((node, index) => {
      const isRoot = index === 0;
      const conceptIndex = index - 1;
      const angle =
        (conceptIndex / Math.max(payload.nodes.length - 1, 1)) * Math.PI * 2;
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
    });
    const generatedEdges = payload.edges.map((edge) => ({
      id: `${topicId}-${edge.id}`,
      source: `${topicId}-${edge.source}`,
      target: `${topicId}-${edge.target}`,
    }));
    setNodes((current) => [...current, ...generatedNodes]);
    setEdges((current) => [...current, ...generatedEdges]);
    setSaveMessage("Map created from your notes.");
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
          if (!isPaid) {
            setSaveMessage("Note import is on Student and Research plans.");
            setMenuOpen(false);
            return;
          }
          setShowImport(true);
          setMenuOpen(false);
        }}
        className="flex w-full items-center justify-between rounded-xl border border-lab-lime/25 bg-lab-lime/10 px-4 py-3 text-left text-sm font-medium text-lab-lime-light"
      >
        Import notes
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
                if (!isPaid) {
                  setSaveMessage("Note import is on Student and Research plans.");
                  return;
                }
                setShowImport(true);
              }}
              className="min-h-10 rounded-xl border border-lab-lime/25 bg-lab-lime/10 px-3 py-2 text-sm font-medium text-lab-lime-light"
            >
              Import
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
              className={
                menuOpen
                  ? "block h-0.5 w-5 translate-y-2 rotate-45 bg-white transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
            />
            <span
              className={
                menuOpen
                  ? "block h-0.5 w-5 bg-white opacity-0 transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
            />
            <span
              className={
                menuOpen
                  ? "block h-0.5 w-5 -translate-y-2 -rotate-45 bg-white transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
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

      {connectMode ? (
        <div className="absolute left-1/2 top-20 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-lab-lime/30 bg-lab-surface/95 px-4 py-3 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-medium text-lab-lime-light">
            Select two topics to explore their connection
          </p>
          <p className="mt-1 text-xs text-white/55">{selectedForConnection.length}/2 selected</p>
          <button
            type="button"
            onClick={() => { setConnectMode(false); setSelectedForConnection([]); }}
            className="mt-2 text-xs text-white/50 underline hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {connectionLoading || connectionError || connectionAnalysis ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="connection-analysis-title"
            className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-lab-lime/20 bg-lab-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lab-lime">MindLab connection</p>
                <h2 id="connection-analysis-title" className="mt-1 text-lg font-semibold">
                  {connectionLoading ? "Exploring the relationship…" : "How these topics connect"}
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  {selectedForConnection.map((item) => String(item.data.label ?? "Topic")).join(" ↔ ")}
                </p>
              </div>
              <button type="button" onClick={closeConnectionAnalysis}
                className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close connection analysis">✕</button>
            </div>
            {connectionLoading ? (
              <p className="py-8 text-center text-sm text-white/60">Gemini is analysing the two topics…</p>
            ) : connectionError ? (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-200">{connectionError}</p>
                <button type="button"
                  onClick={() => { if (selectedForConnection.length === 2) void analyzeConnection(selectedForConnection[0], selectedForConnection[1]); }}
                  className="mt-3 text-xs font-semibold text-white underline">Try again</button>
              </div>
            ) : connectionAnalysis ? (
              <>
                <p className="mb-4 text-sm leading-relaxed text-white/65">{connectionAnalysis.summary}</p>
                {connectionAnalysis.connections.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    No strong conceptual connection was found. Try choosing different topics.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {connectionAnalysis.connections.map((connection, index) => {
                      const exists = edges.some((edge) =>
                        (edge.source === connection.source && edge.target === connection.target) ||
                        (edge.source === connection.target && edge.target === connection.source)
                      );
                      return (
                        <article key={`${connection.source}-${connection.target}-${index}`}
                          className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="text-sm font-semibold text-lab-lime-light">{connection.label}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-white/65">{connection.explanation}</p>
                          <button type="button" onClick={() => addSuggestedConnection(connection)} disabled={exists}
                            className="mt-3 rounded-lg bg-lab-lime px-3 py-2 text-xs font-semibold text-lab-ink disabled:cursor-not-allowed disabled:opacity-40">
                            {exists ? "Already in map" : "Add to map"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
                <button type="button" onClick={closeConnectionAnalysis}
                  className="mt-5 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5">Done</button>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      <KnowledgePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onExpand={expandConcept}
        expanding={expanding}
      />

      <NoteImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        isPaid={isPaid}
        mapId={currentMapId}
        onMapGenerated={handleImportedMap}
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
