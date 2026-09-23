export type MindMapNode = {
  id: string;
  label: string;
  description?: string;
};

export type MindMapEdge = {
  id: string;
  source: string;
  target: string;
};

export type MindMap = {
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};