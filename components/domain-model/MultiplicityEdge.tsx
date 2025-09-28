// MultiplicityEdge.tsx
"use client";

import {
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "reactflow";
import type { DomainMultiplicity, DomainRelation } from "@/lib/api/domain-model";
import { renderMultiplicity } from "./utils";

type EdgeData = {
  relation: DomainRelation;           // ← necesitamos el tipo aquí
  selected?: boolean;
  sourceMultiplicity: DomainMultiplicity;
  targetMultiplicity: DomainMultiplicity;
  
};

const BADGE_OFFSET = 18;
const BADGE_Y_SHIFT = 12;

const EDGE_COLOR = "#94a3b8";           // slate-400
const EDGE_COLOR_SELECTED = "#2563eb";  // blue-600
const EDGE_STROKE = 1.6;                // grosor de línea
const MARKER_SIZE = 10;                // escala base de los marcadores (más chico = más sutil)
const HOLLOW_STROKE = 0.8;              // grosor del borde para triángulo/diamante hueco
const DASH_PATTERN = "5 4";    
function badgePos(x: number, y: number, pos?: Position) {
  switch (pos) {
    case Position.Left:   return { x: x - BADGE_OFFSET, y: y - BADGE_Y_SHIFT };
    case Position.Right:  return { x: x + BADGE_OFFSET, y: y - BADGE_Y_SHIFT };
    case Position.Top:    return { x, y: y - BADGE_OFFSET - BADGE_Y_SHIFT };
    case Position.Bottom: return { x, y: y + BADGE_OFFSET - BADGE_Y_SHIFT };
    default:              return { x, y };
  }
}

/** Decide marcadores y patrón de línea según el tipo UML */
function markersFor(kind: DomainRelation["type"]) {
  switch (kind) {
    case "ASSOCIATION":
      return { start: "none" as const, end: "arrow" as const, dash: undefined };
    case "AGGREGATION":
      return { start: "diamond" as const, end: "none" as const, dash: undefined };
    case "COMPOSITION":
      return { start: "diamondFilled" as const, end: "none" as const, dash: undefined };
    case "GENERALIZATION":
      return { start: "none" as const, end: "triangle" as const, dash: undefined };
    case "REALIZATION":
      return { start: "none" as const, end: "triangle" as const, dash: "4 3" };
    case "DEPENDENCY":
      return { start: "none" as const, end: "arrow" as const, dash: "4 3" };
    case "LINK":
    default:
      return { start: "none" as const, end: "none" as const, dash: undefined };
  }
}

export default function MultiplicityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps<EdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const s = badgePos(sourceX, sourceY, sourcePosition);
  const t = badgePos(targetX, targetY, targetPosition);

  const color = data?.selected ? EDGE_COLOR_SELECTED : (style as any)?.stroke || EDGE_COLOR;
  const { start, end, dash } = markersFor(data!.relation.type);

  // ids únicos por edge
  const mid = (name: string) => `rf-${name}-marker`;

  const badgeCls =
    "rounded px-1.5 py-[1px] text-[10px] font-semibold ring-1 shadow-sm select-none";
  const badgeSelected = "bg-blue-100 text-blue-900 ring-blue-200";
  const badgeNormal = "bg-white text-gray-700 ring-gray-200";

  return (
    <>
      {/* Definiciones de marcadores (diamante, diamante lleno, triángulo, flecha) */}
      <defs>
  {/* Flecha cerrada */}
  <marker
    id={mid("arrow")}
    viewBox="0 0 10 10"
    refX="9" refY="5"
    markerWidth={MARKER_SIZE}
    markerHeight={MARKER_SIZE}
    markerUnits="strokeWidth"
    orient="auto-start-reverse"
  >
    <path d="M0 0 L10 5 L0 10 Z" fill={color} />
  </marker>

  {/* Triángulo hueco */}
  <marker
    id={mid("triangle")}
    viewBox="0 0 10 10"
    refX="9" refY="5"
    markerWidth={MARKER_SIZE}
    markerHeight={MARKER_SIZE}
    markerUnits="strokeWidth"
    orient="auto-start-reverse"
  >
    <path d="M0 0 L10 5 L0 10 Z" fill="white" stroke={color} strokeWidth={HOLLOW_STROKE} />
  </marker>

  {/* Diamante hueco */}
  <marker
    id={mid("diamond")}
    viewBox="0 0 8 8"
    refX="3" refY="4"
    markerWidth={MARKER_SIZE}
    markerHeight={MARKER_SIZE}
    markerUnits="strokeWidth"
    orient="auto"
  >
    <path d="M0 4 L3 7 L6 4 L3 1 Z" fill="white" stroke={color} strokeWidth={HOLLOW_STROKE} />
  </marker>

  {/* Diamante lleno */}
  <marker
    id={mid("diamondFilled")}
    viewBox="0 0 8 8"
    refX="3" refY="4"
    markerWidth={MARKER_SIZE}
    markerHeight={MARKER_SIZE}
    markerUnits="strokeWidth"
    orient="auto"
  >
    <path d="M0 4 L3 7 L6 4 L3 1 Z" fill={color} />
  </marker>
</defs>


      {/* Trazo principal SIN etiqueta intermedia */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={EDGE_STROKE}
        strokeDasharray={dash ? DASH_PATTERN : undefined}
        markerStart={start === "none" ? undefined : `url(#${mid(start)})`}
        markerEnd={end === "none" ? undefined : `url(#${mid(end)})`}
      />

      {/* Chips de multiplicidad en los extremos */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${s.x}px, ${s.y}px)`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <span className={`${badgeCls} ${data?.selected ? badgeSelected : badgeNormal}`}>
            {renderMultiplicity(data!.sourceMultiplicity)}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px)`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <span className={`${badgeCls} ${data?.selected ? badgeSelected : badgeNormal}`}>
            {renderMultiplicity(data!.targetMultiplicity)}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
