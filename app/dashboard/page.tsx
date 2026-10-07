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
import BillingSummary from "@/components/BillingSummary";

import type { MindMapNode } from "@/lib/mindmap";
import { createClient } from "@/lib/supabase/client";

type WorkspaceInvitation = {
  id: string;
  email: string;
  role: "collaborator";
  status: "pending";
  expires_at: string;
  created_at: string;
};

type WorkspaceMember = {
  user_id: string;
  email: string | null;
  role: "owner" | "collaborator";
  created_at: string;
};

type SavedResearchMap = {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
};

const supabase = createClient();

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
  const [linkedTopics, setLinkedTopics] = useState<[Node, Node] | null>(null);
  const [connectionOpinion, setConnectionOpinion] = useState("");
  const [connectionOpinionError, setConnectionOpinionError] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [refiningConnection, setRefiningConnection] = useState(false);
  const [expanding, setExpanding] = useState(false);

  const [saving, setSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState<string | null>(null);
const [mapTitle, setMapTitle] = useState("Untitled research map");

const [savedMaps, setSavedMaps] = useState<SavedResearchMap[]>([]);
const [loadingMaps, setLoadingMaps] = useState(false);
const [showSavedMaps, setShowSavedMaps] = useState(false);
const [currentMapId, setCurrentMapId] = useState<string | null>(null);
const [currentMapOwnerId, setCurrentMapOwnerId] = useState<string | null>(null);

const [showShare, setShowShare] = useState(false);
const [inviteEmail, setInviteEmail] = useState("");
const [inviting, setInviting] = useState(false);
const [inviteMessage, setInviteMessage] = useState<string | null>(null);
const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
const [members, setMembers] = useState<WorkspaceMember[]>([]);
const [loadingCollaborators, setLoadingCollaborators] = useState(false);

   
useEffect(() => {
  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setCurrentUserId(user.id);
    setUserEmail(user.email ?? null);

    const requestedMapId = new URLSearchParams(window.location.search).get("map");
    if (requestedMapId) {
      const { data: requestedMap, error } = await supabase
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
      } else {
        setSaveMessage("You do not have access to that workspace.");
      }
    }
  };

  loadUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    setCurrentUserId(session.user.id);
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
    setLinkedTopics(null);
    setConnectionOpinion("");
    setConnectionOpinionError(null);

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
              stroke: "#c8f169",
              strokeWidth: 2,
            },

            labelStyle: {
              fill: "#d9f4a6",
              fontSize: 12,
            },

            labelBgStyle: {
              fill: "#101511",
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
      setLinkedTopics([first, second]);

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

  async function refineConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!linkedTopics || !connectionOpinion.trim()) return;

    setRefiningConnection(true);
    setConnectionOpinionError(null);
    const [first, second] = linkedTopics;

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicA: {
            id: first.id,
            label: first.data.label,
            description: first.data.description,
          },
          topicB: {
            id: second.id,
            label: second.data.label,
            description: second.data.description,
          },
          opinion: connectionOpinion.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refine the explanation.");
      }

      setConnectionExplanation(data.summary);
    } catch (error) {
      console.error("Connection refinement error:", error);
      setConnectionOpinionError("Couldn't refine the explanation. Please try again.");
    } finally {
      setRefiningConnection(false);
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
    setLinkedTopics(null);
    setConnectionOpinion("");
    setConnectionOpinionError(null);
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

  const { data, error: saveError } = await supabase
    .from("research_maps")
    .insert({
      user_id: user.id,
      title: mapTitle || "Untitled research map",
      nodes,
      edges,
    })
    .select("id")
    .single();

  if (saveError) {
    console.error("Failed to save research map:", saveError);
    setSaveMessage("Could not save your map.");
  } else {
    setCurrentMapId(data.id);
    setCurrentMapOwnerId(user.id);
    setSaveMessage("Map saved successfully.");
  }

  setSaving(false);
}


 


function openSavedMap(map: SavedResearchMap) {
  setNodes(map.nodes ?? []);
  setEdges(map.edges ?? []);
  setMapTitle(map.title ?? "Untitled research map");

  setCurrentMapId(map.id);
  setCurrentMapOwnerId(map.user_id);

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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load maps:", error.message);
  } else {
    setSavedMaps(data ?? []);
  }

  setLoadingMaps(false);
}

async function loadCollaborators() {
  if (!currentMapId) return;

  setLoadingCollaborators(true);
  try {
    const response = await fetch(
      `/api/invitations?mapId=${encodeURIComponent(currentMapId)}`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load collaborators.");
    setInvitations(data.invitations ?? []);
    setMembers(data.members ?? []);
  } catch (error) {
    setInviteMessage(error instanceof Error ? error.message : "Failed to load collaborators.");
  } finally {
    setLoadingCollaborators(false);
  }
}

async function sendInvitation() {
  if (!currentMapId) {
    setInviteMessage("Save this map before inviting someone.");
    return;
  }

  if (!inviteEmail.trim()) {
    setInviteMessage("Enter an email address.");
    return;
  }

  setInviting(true);
  setInviteMessage(null);
  setInvitationUrl(null);

  try {
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mapId: currentMapId,
        email: inviteEmail.trim(),
        role: "collaborator",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setInviteMessage(data.error || "Failed to send invitation.");
      return;
    }

    setInviteMessage(`Invitation sent to ${inviteEmail.trim()}.`);
    setInvitationUrl(data.invitationUrl);
    setInviteEmail("");
    await loadCollaborators();
  } catch (error) {
    console.error("Invitation error:", error);
    setInviteMessage("Something went wrong creating the invitation.");
  } finally {
    setInviting(false);
  }
}

async function revokeInvitation(invitationId: string) {
  setInviteMessage(null);
  try {
    const response = await fetch("/api/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to revoke invitation.");
    setInvitationUrl(null);
    setInviteMessage("Invitation revoked.");
    await loadCollaborators();
  } catch (error) {
    setInviteMessage(error instanceof Error ? error.message : "Failed to revoke invitation.");
  }
}

async function copyInvitationLink() {
  if (!invitationUrl) return;
  try {
    await navigator.clipboard.writeText(invitationUrl);
    setInviteMessage("Invitation link copied.");
  } catch {
    setInviteMessage("Copy failed. Select and copy the invitation link.");
  }
}

return (
  <main className="relative h-dvh w-full overflow-hidden bg-background text-foreground">

      {/* HEADER */}

      <header className="absolute left-0 right-0 top-0 z-30 flex flex-col gap-2 border-b border-white/10 bg-background/90 px-3 py-2 backdrop-blur-xl sm:px-5 sm:py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">

        {/* Logo */}

        <div className="flex items-center justify-between gap-2 2xl:block">
          <h1 className="text-xl font-bold tracking-tight">
            MindLab
            <span className="text-lab-lime">
              AI
            </span>
          </h1>

          <p className="text-xs text-white/40">
            Turn thoughts into knowledge
          </p>

          <div className="flex shrink-0 items-center gap-2 2xl:hidden">
            <BillingSummary />
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-10 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-xs text-red-300 transition hover:bg-red-500/20"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Controls */}

        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 2xl:w-auto 2xl:overflow-visible 2xl:pb-0">


         {saveMessage && (
  <p className="hidden text-xs text-white/60 2xl:block">
    {saveMessage}
  </p>
)}
          {/* Topic input */}

          <form
            onSubmit={generateMindMap}
            className="flex shrink-0 gap-2"
          >
            <input
              value={topic}
              onChange={(e) =>
                setTopic(e.target.value)
              }
              placeholder="Add a research topic..."
              className="w-40 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lab-lime/50 focus:bg-white/10 sm:w-56 sm:px-4 2xl:w-80"
            />

            <button
              type="submit"
              disabled={loading}
              className="min-h-10 whitespace-nowrap rounded-xl bg-lab-lime px-3 py-2 text-sm font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 2xl:px-5"
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
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition sm:px-4 2xl:px-5 ${
              connectMode
                ? "border-lab-lime bg-lab-lime/20 text-lab-lime-light"
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
  className="min-h-10 shrink-0 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium transition hover:bg-white/10 sm:px-4 2xl:px-5"
>
  Saved Maps
</button>

          
<button
  type="button"
  onClick={saveCurrentMap}
  disabled={saving || nodes.length === 0}
  className="min-h-10 shrink-0 whitespace-nowrap rounded-xl border border-lab-copper/20 bg-lab-copper/10 px-3 py-2 text-sm font-medium text-lab-copper transition hover:bg-lab-copper/20 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 2xl:px-5"
>
  {saving ? "Saving..." : "Save Map"}
</button>

{currentMapId && currentMapOwnerId === currentUserId && (
  <button
    type="button"
    onClick={() => {
      setInviteMessage(null);
      setInvitationUrl(null);
      setShowShare(true);
      void loadCollaborators();
    }}
    className="min-h-10 shrink-0 whitespace-nowrap rounded-xl border border-lab-lime/20 bg-lab-lime/10 px-3 py-2 text-sm font-medium text-lab-lime-light transition hover:bg-lab-lime/20 sm:px-4 2xl:px-5"
  >
    Invite
  </button>
)}

        </div>
        
{userEmail && (
  <span className="hidden max-w-52 truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 2xl:block">
    {userEmail}
  </span>
)}

<div className="hidden 2xl:block">
  <BillingSummary />
</div>

<button
  type="button"
  onClick={handleLogout}
  className="hidden min-h-10 whitespace-nowrap rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 2xl:block"
>
  Log out
</button>
      </header>

      {/* CONNECTION MODE */}

      {connectMode && (
        <div className="absolute left-1/2 top-[120px] z-40 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-lab-lime/20 bg-lab-surface/90 px-4 py-4 text-center shadow-2xl backdrop-blur-xl 2xl:top-24 sm:px-6">

          <p className="text-sm text-white/70">
            Select two concepts
            to connect
          </p>

          <p className="mt-1 text-xs text-lab-lime">
            {selectedForConnection.length}
            /2 selected
          </p>

          {selectedForConnection.length ===
            2 && (
            <button
              onClick={connectTopics}
              disabled={connecting}
              className="mt-3 w-full rounded-xl bg-lab-lime px-4 py-2 text-sm font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting
                ? "Analyzing..."
                : "Connect Concepts"}
            </button>
          )}

        </div>
      )}

    

      {connectionExplanation && (
        <div className="absolute bottom-3 left-3 right-3 z-40 rounded-2xl border border-lab-lime/20 bg-lab-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(420px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:p-5">

          <div className="mb-2 flex items-center gap-2">

            <span className="text-lab-lime">
              ✦
            </span>

            <span className="text-xs font-medium uppercase tracking-widest text-lab-lime">
              Connection Explanation
            </span>

          </div>

          <p className="text-sm leading-6 text-white/70">
            {connectionExplanation}
          </p>

          {linkedTopics && (
            <form onSubmit={refineConnection} className="mt-4 space-y-2">
              <label
                htmlFor="connection-opinion"
                className="block text-xs font-medium text-white/70"
              >
                What&apos;s your opinion?
              </label>
              <textarea
                id="connection-opinion"
                value={connectionOpinion}
                onChange={(event) => setConnectionOpinion(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Share what you're trying to understand..."
                disabled={refiningConnection}
                className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-lab-lime/50 disabled:opacity-60"
              />
              {connectionOpinionError && (
                <p role="alert" className="text-xs text-red-300">
                  {connectionOpinionError}
                </p>
              )}
              <button
                type="submit"
                disabled={refiningConnection || !connectionOpinion.trim()}
                className="rounded-lg bg-lab-lime px-3 py-2 text-xs font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refiningConnection ? "Refining..." : "Refine explanation"}
              </button>
            </form>
          )}

          <button
            onClick={() => {
              setConnectionExplanation(null);
              setLinkedTopics(null);
              setConnectionOpinion("");
              setConnectionOpinionError(null);
            }}
            className="mt-4 text-xs text-white/40 transition hover:text-white"
          >
            Dismiss
          </button>

        </div>
      )}

      
{showSavedMaps && (
  <div className="absolute left-3 right-3 top-[120px] z-50 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl border border-white/10 bg-lab-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:top-24 sm:w-80 sm:p-5">
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
            className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-lab-lime/10"
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

{showShare && currentMapId && currentMapOwnerId === currentUserId && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="collaborators-title"
      className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-lab-surface p-5 text-white shadow-2xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="collaborators-title" className="text-lg font-semibold">Invite collaborators</h2>
          <p className="mt-1 text-sm text-white/50">Invite someone to this saved workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowShare(false)}
          aria-label="Close invite dialog"
          className="rounded-lg px-2 py-1 text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendInvitation();
        }}
        className="mt-5 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="email"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
          disabled={inviting}
          maxLength={254}
          required
          placeholder="Email address"
          aria-label="Collaborator email address"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-lab-lime/60"
        />
        <button
          type="submit"
          disabled={inviting}
          className="rounded-xl bg-lab-lime px-5 py-3 text-sm font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {inviting ? "Sending..." : "Send invitation"}
        </button>
      </form>

      {inviteMessage && (
        <p role="status" className="mt-3 text-sm text-white/70">
          {inviteMessage}
        </p>
      )}

      {invitationUrl && (
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={invitationUrl}
            aria-label="Invitation link"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70 outline-none"
          />
          <button
            type="button"
            onClick={copyInvitationLink}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/10"
          >
            Copy link
          </button>
        </div>
      )}

      <div className="mt-7 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold">Members</h3>
        {loadingCollaborators ? (
          <p className="mt-3 text-sm text-white/45">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No members found.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.07]">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate text-sm text-white/75">{member.email || "Workspace member"}</span>
                <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[11px] capitalize text-white/50">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        {!loadingCollaborators && invitations.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No pending invitations.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.07]">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/75">{invitation.email}</p>
                  <p className="mt-1 text-xs text-white/40">
                    Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeInvitation(invitation.id)}
                  className="shrink-0 rounded-lg border border-lab-copper/20 px-3 py-1.5 text-xs text-lab-copper transition hover:bg-lab-copper/10"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  </div>
)}

      {/* CANVAS */}

      <div className="h-full w-full pt-[116px] 2xl:pt-[73px]">

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