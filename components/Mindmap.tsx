"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

type MindMapProps = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onNodeClick: (
    event: React.MouseEvent,
    node: Node
  ) => void;
};

export default function MindMap({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
}: MindMapProps) {
  return (
    <div className="h-full w-full">
  <ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodeClick={onNodeClick}
>
       <Background
  variant="dots"
  gap={24}
  size={1}
  color="#6b21a8"
/>
       <Controls
  className="!border-white/10 !bg-zinc-950/80 !shadow-xl"
/>

        <MiniMap
          nodeColor="#a855f7"
          maskColor="rgba(0, 0, 0, 0.75)"
        />
      </ReactFlow>
    </div>
  );
}