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
  type OnEdgeUpdateFunc,
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import MultiplicityEdge from "./MultiplicityEdge";
import type { DomainClass, DomainRelation, DomainMultiplicity } from "@/lib/api/domain-model";
import { renderMultiplicity } from "./utils";
type DiagramNodeData = {
  domainClass: DomainClass;
  selected: boolean;
  onSelect: (classId: string) => void;
};
import type { Edge as RFEdge } from "reactflow";
interface DomainModelDiagramProps {
  classes: DomainClass[];
  relations: DomainRelation[];
  selectedClassId: string | null;
  selectedRelationId: string | null;
  onSelectClass: (classId: string) => void;
  onSelectRelation?: (relationId: string | null) => void;
  onCreateRelation?: (sourceId: string, targetId: string) => void;
}

type EdgeData = {
  relation: DomainRelation;               // lo dejamos para onClick
  selected: boolean;
  sourceMultiplicity: DomainMultiplicity; // para el chip en el extremo source
  targetMultiplicity: DomainMultiplicity; // para el chip en el extremo target
  labelText?: string; 
};

const nodeTypes = {
  classNode: ClassNode,
};

type XYPosition = { x: number; y: number };

const EDGE_COLOR = "#2563eb";
const EDGE_COLOR_SELECTED = "#1d4ed8";
// const EDGE_LABEL_COLOR = "#1f2937"; // si lo usas, agrégalo a labelStyle

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
  const [edges, setEdges] = useEdgesState<EdgeData>([]);

  // id -> nombre de clase (para etiquetas legibles)
  const classNameById = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name] as const)),
    [classes],
  );
  const [edgeAnchors, setEdgeAnchors] = useState<Record<string, { sourceHandle?: string; targetHandle?: string }>>({});

// Permite “mover” el extremo de una arista y recordar el puerto
const onEdgeUpdate = useCallback<OnEdgeUpdateFunc>((oldEdge, newConn) => {
  setEdgeAnchors((prev) => ({
    ...prev,
    [String(oldEdge.id)]: {
      sourceHandle: newConn.sourceHandle ?? prev[String(oldEdge.id)]?.sourceHandle,
      targetHandle: newConn.targetHandle ?? prev[String(oldEdge.id)]?.targetHandle,
    },
  }));
}, []);

  // Posicionamiento inicial en grilla + saneo cuando cambian clases
  useEffect(() => {
    setPositions((prev) => {
      const next: Record<string, XYPosition> = { ...prev };
      const present = new Set<string>();
      classes.forEach((domainClass, index) => {
        present.add(domainClass.id);
        if (!next[domainClass.id]) next[domainClass.id] = computeGridPosition(index, classes.length);
      });
      Object.keys(next).forEach((id) => {
        if (!present.has(id)) delete next[id];
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

  // Construcción de nodos
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

  // Edge types (edge personalizado que muestra multiplicidades)
  const edgeTypes = useMemo(() => ({ multiplicity: MultiplicityEdge }), []);

  // Construcción de aristas con etiquetas legibles y estilo por tipo



  // Guardar posiciones al mover
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
      const moved = changes.filter(isNodePositionChange);
      if (moved.length > 0) {
        setPositions((prev) => {
          const next = { ...prev };
          moved.forEach((change) => {
            if (!("position" in change) || !change.position) return;
            next[change.id] = change.position;
          });
          return next;
        });
      }
    },
    [onNodesChangeInternal],
  );

  // Evitar duplicados y auto-bucles
  const relationPairs = useMemo(
    () => new Set(relations.map((r) => `${r.sourceClassId}::${r.targetClassId}`)),
    [relations],
  );
  const joinMeta = useMemo(() => {
  const bySource = new Map<string, DomainRelation[]>();
  relations.forEach((r) => {
    if (!bySource.has(r.sourceClassId)) bySource.set(r.sourceClassId, []);
    bySource.get(r.sourceClassId)!.push(r);
  });

  const joinEdgeIds = new Set<string>();
  bySource.forEach((out, classId) => {
    if (
      out.length === 2 &&
      out.every(r => r.sourceMultiplicity === "CERO_O_MAS" && r.targetMultiplicity === "UNO") &&
      out[0].targetClassId !== out[1].targetClassId
    ) {
      joinEdgeIds.add(out[0].id);
      joinEdgeIds.add(out[1].id);
    }
  });

  return { joinEdgeIds };
}, [relations]);


useEffect(() => {
  const mappedEdges: Edge<EdgeData>[] = relations.map((relation) => {
    const isSelected = relation.id === selectedRelationId;
    const s = styleFor(relation.type);
    const isJoinLeg = joinMeta.joinEdgeIds.has(relation.id);
    const labelText = `${s.badge ? s.badge + " " : ""}${formatRelationLabel(relation, classNameById)}`.trim();

    return {
      id: relation.id,
      source: relation.sourceClassId,
      target: relation.targetClassId,
      type: "multiplicity",
      data: {
        relation,
        selected: isSelected,
        sourceMultiplicity: relation.sourceMultiplicity,
        orthogonal: isJoinLeg ? true : undefined,
        labelYOffset: isJoinLeg ? 8 : 0,
        targetMultiplicity: relation.targetMultiplicity,
        labelText,
      },
      label: labelText,
      selectable: true,
      updatable: true,
      interactionWidth: 28,
      sourceHandle: isJoinLeg ? "b-s-8" : edgeAnchors[relation.id]?.sourceHandle,
      targetHandle: isJoinLeg ? "t-t-8" : edgeAnchors[relation.id]?.targetHandle,
      style: isJoinLeg
        ? { strokeDasharray: "4 3", strokeWidth: 2 }
        : (s.dash ? { strokeDasharray: s.dash, strokeWidth: 2 } : { strokeWidth: 2 }),
      animated: isSelected,
      zIndex: isSelected ? 3 : 1,
    };
  });

  setEdges(mappedEdges);
}, [
  relations,
  selectedRelationId,
  classNameById,
  edgeAnchors,
  setEdges,
  joinMeta.joinEdgeIds,

]);

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
    (_: MouseEvent, edge: Edge<EdgeData>) => {
      onSelectClass?.("");
      onSelectRelation?.(String(edge.id));
    },
    [onSelectRelation, onSelectClass],
  );

  const handlePaneClick = useCallback(() => {
    onSelectRelation?.(null);
    onSelectClass?.("");
  }, [onSelectRelation, onSelectClass]);

  return (
    <div style={{ height: "75vh", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        panOnScroll
        panOnDrag
        selectionOnDrag
        zoomOnDoubleClick={false}
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
          nodeStrokeColor={(n) => (n.data?.selected ? EDGE_COLOR_SELECTED : "#9ca3af")}
          nodeColor={(n) => (n.data?.selected ? "#dbeafe" : "#f9fafb")}
        />
        <Controls
          position="bottom-right"
          showFitView
          showInteractive={false}
          style={{ right: 12, bottom: 12, transform: "scale(0.82)" }}
        />
      </ReactFlow>
    </div>
  );
}

function styleFor(kind: string) {
  switch (kind) {
    case "REALIZATION":   return { dash: "6 4", end: MarkerType.Arrow };         // triángulo hueco aprox + dashed
    case "GENERALIZATION":return { dash: undefined, end: MarkerType.Arrow };     // triángulo hueco aprox
    case "DEPENDENCY":    return { dash: "4 3", end: MarkerType.Arrow };         // dashed
    case "AGGREGATION":   return { dash: undefined, end: MarkerType.ArrowClosed, badge: "◇" };
    case "COMPOSITION":   return { dash: undefined, end: MarkerType.ArrowClosed, badge: "◆" };
    case "LINK":          return { dash: undefined, end: undefined };            // sin flechas
    case "ASSOCIATION":
    default:              return { dash: undefined, end: MarkerType.ArrowClosed };
  }
}

function ClassNode({ data }: NodeProps<DiagramNodeData>) {
  const { domainClass, selected, onSelect } = data;

  // Cantidad de “puertos” por lado (ajustá a gusto)
  const PORTS_PER_SIDE = 16;
  const POS = useMemo(
    () => Array.from({ length: PORTS_PER_SIDE }, (_, i) => ((i + 1) / (PORTS_PER_SIDE + 1)) * 100),
    []
  );

  return (
    <div
      onClick={() => onSelect(domainClass.id)}
      className={clsx(
        "min-w-[220px] max-w-[260px] rounded-lg border bg-white shadow-sm",
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-300",
      )}
    >
      {/* ======= HANDLES INVISIBLES EN TODO EL BORDE ======= */}
      {/* Top: source + target */}
      {POS.map((p, i) => (
        <Handle key={`t-s-${i}`} id={`t-s-${i}`} type="source" position={Position.Top}
                style={{ left: `${p}%` }} className="handle-invisible" isConnectable />
      ))}
      {POS.map((p, i) => (
        <Handle key={`t-t-${i}`} id={`t-t-${i}`} type="target" position={Position.Top}
                style={{ left: `${p}%` }} className="handle-invisible" isConnectable />
      ))}

      {/* Bottom */}
      {POS.map((p, i) => (
        <Handle key={`b-s-${i}`} id={`b-s-${i}`} type="source" position={Position.Bottom}
                style={{ left: `${p}%` }} className="handle-invisible" isConnectable />
      ))}
      {POS.map((p, i) => (
        <Handle key={`b-t-${i}`} id={`b-t-${i}`} type="target" position={Position.Bottom}
                style={{ left: `${p}%` }} className="handle-invisible" isConnectable />
      ))}

      {/* Left */}
      {POS.map((p, i) => (
        <Handle key={`l-s-${i}`} id={`l-s-${i}`} type="source" position={Position.Left}
                style={{ top: `${p}%` }} className="handle-invisible" isConnectable />
      ))}
      {POS.map((p, i) => (
        <Handle key={`l-t-${i}`} id={`l-t-${i}`} type="target" position={Position.Left}
                style={{ top: `${p}%` }} className="handle-invisible" isConnectable />
      ))}

      {/* Right */}
      {POS.map((p, i) => (
        <Handle key={`r-s-${i}`} id={`r-s-${i}`} type="source" position={Position.Right}
                style={{ top: `${p}%` }} className="handle-invisible" isConnectable />
      ))}
      {POS.map((p, i) => (
        <Handle key={`r-t-${i}`} id={`r-t-${i}`} type="target" position={Position.Right}
                style={{ top: `${p}%` }} className="handle-invisible" isConnectable />
      ))}

      {/* ======= CONTENIDO DE LA TARJETA ======= */}
      <div className="border-b px-3 py-1.5">
        <div className="flex items-center justify-between">
          <h4 className="truncate text-sm font-semibold text-gray-900">{domainClass.name}</h4>
          <span className="rounded bg-gray-100 px-2 py-[2px] text-[10px] text-gray-600">
            {domainClass.attributes.length} attrs
          </span>
        </div>
        {domainClass.description ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{domainClass.description}</p>
        ) : null}
      </div>

      {domainClass.attributes.length > 0 && (
        <div className="px-3 py-2">
          <ul className="space-y-1.5">
            {domainClass.attributes.slice(0, 6).map((attribute) => (
              <li key={attribute.id} className="flex items-center justify-between">
                <span className="truncate text-[12px] text-gray-700">{attribute.name}</span>
                <span className="text-[11px] text-indigo-500">{attribute.type}</span>
              </li>
            ))}
            {domainClass.attributes.length > 6 ? (
              <li className="text-[11px] text-gray-400">+ {domainClass.attributes.length - 6} atributos</li>
            ) : null}
          </ul>
        </div>
      )}
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

// Etiqueta de relación (no muestra UUIDs)
const formatRelationLabel = (relation: DomainRelation, nameById: Record<string, string>) => {
  const sourceName = relation.sourceRole?.trim() || nameById[relation.sourceClassId] || "Origen";
  const targetName = relation.targetRole?.trim() || nameById[relation.targetClassId] || "Destino";
  const left = `${sourceName} (${renderMultiplicity(relation.sourceMultiplicity)})`;
  const right = `${targetName} (${renderMultiplicity(relation.targetMultiplicity)})`;
  return relation.name ? `${relation.name} | ${left} -> ${right}` : `${left} -> ${right}`;
};

// helpers (React Flow v11: cambio de posición es "position")
function isNodePositionChange(change: NodeChange): change is NodePositionChange {
  return change.type === "position";
}
