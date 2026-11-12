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
    <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(200,241,105,0.045),transparent_62%)]">
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
  color="#44533d"
/>
       <Controls
  className="border-white/10! bg-lab-surface/90! shadow-xl! backdrop-blur!"
/>

        <MiniMap
          nodeColor="#c8f169"
          maskColor="rgba(0, 0, 0, 0.75)"
          style={{ width: 120, height: 80, right: 12, bottom: 12 }}
        />
      </ReactFlow>
    </div>
  );
}
