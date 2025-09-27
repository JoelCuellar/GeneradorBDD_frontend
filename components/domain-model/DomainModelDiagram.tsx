
"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import ReactFlow, {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import type { DomainClass, DomainRelation } from "@/lib/api/domain-model";
import { renderMultiplicity } from "./utils";

type DiagramNodeData = {
  domainClass: DomainClass;
  selected: boolean;
  onSelect: (classId: string) => void;
};

interface DomainModelDiagramProps {
  classes: DomainClass[];
  relations: DomainRelation[];
  selectedClassId: string | null;
  selectedRelationId: string | null;
  onSelectClass: (classId: string) => void;
  onSelectRelation?: (relationId: string | null) => void;
  onCreateRelation?: (sourceId: string, targetId: string) => void;
}

const nodeTypes = {
  classNode: ClassNode,
};

type XYPosition = { x: number; y: number };

const EDGE_COLOR = "#2563eb";
const EDGE_COLOR_SELECTED = "#1d4ed8";
const EDGE_LABEL_COLOR = "#1f2937";

export default function DomainModelDiagram({
  classes,
  relations,
  selectedClassId,
  selectedRelationId,
  onSelectClass,
  onSelectRelation,
  onCreateRelation,
}: DomainModelDiagramProps) {
  const [positions, setPositions] = useState<Record<string, XYPosition>>({});
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<DiagramNodeData>([]);
  const [edges, setEdges] = useEdgesState<{ relation: DomainRelation; selected: boolean }>([]);

  useEffect(() => {
    setPositions((prev) => {
      const next: Record<string, XYPosition> = { ...prev };
      const present = new Set<string>();
      classes.forEach((domainClass, index) => {
        present.add(domainClass.id);
        if (!next[domainClass.id]) {
          next[domainClass.id] = computeGridPosition(index, classes.length);
        }
      });
      Object.keys(next).forEach((id) => {
        if (!present.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [classes]);

  const handleSelectClass = useCallback(
    (classId: string) => {
      onSelectRelation?.(null);
      onSelectClass(classId);
    },
    [onSelectClass, onSelectRelation],
  );

  useEffect(() => {
    const mappedNodes: Node<DiagramNodeData>[] = classes.map((domainClass, index) => ({
      id: domainClass.id,
      type: "classNode",
      position: positions[domainClass.id] ?? computeGridPosition(index, classes.length),
      data: {
        domainClass,
        selected: domainClass.id === selectedClassId,
        onSelect: handleSelectClass,
      },
      draggable: true,
    }));
    setNodes(mappedNodes);
  }, [classes, selectedClassId, positions, setNodes, handleSelectClass]);

  useEffect(() => {
    const mappedEdges: Edge<{ relation: DomainRelation; selected: boolean }>[] = relations.map((relation) => {
      const isSelected = relation.id === selectedRelationId;
      return {
        id: relation.id,
        source: relation.sourceClassId,
        target: relation.targetClassId,
        type: "smoothstep",
        label: formatRelationLabel(relation),
        data: { relation, selected: isSelected },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSelected ? EDGE_COLOR_SELECTED : EDGE_COLOR,
          width: 18,
          height: 18,
        },
        style: {
          stroke: isSelected ? EDGE_COLOR_SELECTED : EDGE_COLOR,
          strokeWidth: isSelected ? 2.4 : 1.5,
        },
        animated: isSelected,
        labelStyle: {
          fill: isSelected ? "#111827" : EDGE_LABEL_COLOR,
          fontSize: isSelected ? 12 : 11,
          fontWeight: isSelected ? 600 : 500,
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        labelBgStyle: {
          fill: isSelected ? "rgba(219,234,254,0.95)" : "rgba(255,255,255,0.9)",
          stroke: isSelected ? "#bfdbfe" : "#dbeafe",
          strokeWidth: 0.6,
        },
        zIndex: isSelected ? 2 : 0,
      };
    });
    setEdges(mappedEdges);
  }, [relations, setEdges, selectedRelationId]);

  const isNodePositionChange = (change: NodeChange): change is NodePositionChange =>
    change.type === "position" && change.position != null;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
      const moved = changes.filter(isNodePositionChange);
      if (moved.length > 0) {
        setPositions((prev) => {
          const next = { ...prev };
          moved.forEach((change) => {
            if (!change.position) return;
            next[change.id] = change.position;
          });
          return next;
        });
      }
    },
    [onNodesChangeInternal],
  );

  const relationPairs = useMemo(
    () => new Set(relations.map((relation) => `${relation.sourceClassId}::${relation.targetClassId}`)),
    [relations],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!onCreateRelation || !connection.source || !connection.target) return;
      const key = `${connection.source}::${connection.target}`;
      if (relationPairs.has(key)) return;
      if (connection.source === connection.target) return;
      onCreateRelation(connection.source, connection.target);
    },
    [onCreateRelation, relationPairs],
  );

  const handleEdgeClick = useCallback(
    (_event: MouseEvent, edge: Edge<{ relation: DomainRelation }>) => {
      onSelectRelation?.(edge.id);
    },
    [onSelectRelation],
  );

  const handlePaneClick = useCallback(() => {
    onSelectRelation?.(null);
  }, [onSelectRelation]);

  return (
    <div className="h-[680px] rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Diagrama de clases UML (version 2.5)</h3>
          <p className="text-xs text-gray-500">
            Arrastra y conecta para proponer relaciones. Selecciona nodos o aristas para ver sus detalles.
          </p>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.35, maxZoom: 1.6 }}
        connectionMode={ConnectionMode.Loose}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.6}
        className="reactflow-domain-diagram"
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeColor={(node) => (node.data?.selected ? EDGE_COLOR_SELECTED : "#9ca3af")}
          nodeColor={(node) => (node.data?.selected ? "#dbeafe" : "#f9fafb")}
        />
        <Controls position="bottom-right" showFitView showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function ClassNode({ data }: NodeProps<DiagramNodeData>) {
  const { domainClass, selected, onSelect } = data;

  return (
    <div
      className={clsx(
        "relative w-[240px] cursor-pointer rounded-lg border bg-white text-left shadow-sm transition",
        selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-gray-300 hover:border-blue-300 hover:shadow",
      )}
      onClick={() => onSelect(domainClass.id)}
    >
      <Handle position={Position.Top} type="target" className="h-2 w-2 !bg-blue-400 opacity-0 transition-opacity hover:opacity-100" />
      <Handle position={Position.Left} type="target" className="h-2 w-2 !bg-blue-400 opacity-0 transition-opacity hover:opacity-100" />
      <Handle position={Position.Right} type="source" className="h-2 w-2 !bg-blue-400 opacity-0 transition-opacity hover:opacity-100" />
      <Handle position={Position.Bottom} type="source" className="h-2 w-2 !bg-blue-400 opacity-0 transition-opacity hover:opacity-100" />
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-sm font-semibold text-gray-900">{domainClass.name}</span>
        <span className="text-[11px] uppercase tracking-wide text-gray-400">{domainClass.attributes.length} atr</span>
      </div>
      <div className="max-h-40 overflow-hidden px-3 py-2">
        {domainClass.attributes.length === 0 ? (
          <p className="text-xs italic text-gray-400">Sin atributos</p>
        ) : (
          <ul className="space-y-1 text-xs text-gray-600">
            {domainClass.attributes.slice(0, 6).map((attribute) => (
              <li key={attribute.id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700">{attribute.name}</span>
                <span className="text-[11px] text-indigo-500">{attribute.type}</span>
              </li>
            ))}
            {domainClass.attributes.length > 6 ? (
              <li className="text-[11px] text-gray-400">+ {domainClass.attributes.length - 6} atributos</li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}

const computeGridPosition = (index: number, total: number): XYPosition => {
  if (total === 0) return { x: 0, y: 0 };
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const spacingX = 320;
  const spacingY = 240;
  return { x: column * spacingX, y: row * spacingY };
};

const formatRelationLabel = (relation: DomainRelation) => {
  const left = `${relation.sourceRole ?? relation.sourceClassId} (${renderMultiplicity(relation.sourceMultiplicity)})`;
  const right = `${relation.targetRole ?? relation.targetClassId} (${renderMultiplicity(relation.targetMultiplicity)})`;
  return relation.name ? `${relation.name} | ${left} -> ${right}` : `${left} -> ${right}`;
};
