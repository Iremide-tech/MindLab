"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

type MindMapProps = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
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
  variant={BackgroundVariant.Dots}
  gap={24}
  size={1}
  color="#526448"
/>
       <Controls
  className="border-white/10! bg-lab-surface/80! shadow-xl!"
/>

        <MiniMap
          nodeColor="#c8f169"
          maskColor="rgba(0, 0, 0, 0.75)"
          style={{ width: 120, height: 80, right: 8, bottom: 8 }}
        />
      </ReactFlow>
    </div>
  );
}