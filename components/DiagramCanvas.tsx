"use client";

import React from "react";
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge, addEdge, Connection,
  useNodesState, useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import { useModelStore } from "@/lib/store";

export default function DiagramCanvas() {
  const { model, addClass, addRelation } = useModelStore();
  const initialNodes: Node[] = model.classes.map((c, i) => ({
    id: c.id,
    position: { x: 100 + i*80, y: 80 + i*40 },
    data: { label: c.name },
    type: "default",
  }));
  const initialEdges: Edge[] = model.relations.map(r => ({
    id: r.id, source: r.sourceId, target: r.targetId, label: r.name ?? ""
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = React.useCallback((c: Connection) => {
    if (c.source && c.target) {
      const rel = addRelation(c.source, c.target);
      setEdges(eds => addEdge({ ...c, id: rel.id }, eds));
    }
  }, [addRelation, setEdges]);

  const handleAddClass = () => {
    const cls = addClass();
    setNodes(ns => ns.concat({
      id: cls.id,
      position: { x: 100 + Math.random()*200, y: 100 + Math.random()*150 },
      data: { label: cls.name },
      type: "default"
    }));
  };

  return (
    <div className="h-[80vh] border rounded-xl overflow-hidden">
      <div className="p-2 flex gap-2 border-b bg-white">
        <button onClick={handleAddClass} className="px-3 py-1 rounded-md border hover:bg-gray-50">+ Clase</button>
        <span className="text-sm text-gray-500">Arrastra desde un nodo a otro para crear relación.</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
