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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedForConnection, setSelectedForConnection] = useState<Node[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expanding, setExpanding] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? null);
    };
    void loadUser();
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.replace("/login");
      else setUserEmail(session.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [router]);

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

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
      <header className="absolute left-0 right-0 top-0 z-30 flex flex-col gap-3 border-b border-white/10 bg-background/95 px-3 py-3 backdrop-blur-xl sm:px-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex items-center justify-between gap-3 2xl:block">
          <h1 className="text-xl font-bold tracking-[-0.03em]">
            MindLab<span className="text-lab-lime">AI</span>
          </h1>
          <p className="mt-0.5 hidden text-xs text-white/40 sm:block">
            Turn thoughts into knowledge
          </p>
          <div className="flex shrink-0 items-center gap-2 2xl:hidden">
            <BillingSummary />
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-10 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-xs text-red-300"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto">
          <form onSubmit={generateMindMap} className="flex min-w-0 flex-1 gap-2 sm:flex-none">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Add a research topic..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-lab-lime/50 sm:w-56"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-10 rounded-xl bg-lab-lime px-3 py-2 text-sm font-medium text-lab-ink disabled:opacity-50"
            >
              {loading ? "…" : "Add"}
            </button>
          </form>

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
            Connect{selectedForConnection.length > 0 ? ` (${selectedForConnection.length}/2)` : ""}
          </button>

          <div className="hidden 2xl:block">
            <BillingSummary />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="hidden min-h-10 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-xs text-red-300 2xl:block"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="h-full w-full pt-32 sm:pt-36 md:pt-40 2xl:pt-[73px]">
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
    </main>
  );
}
