// MultiplicityEdge.tsx
"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath, // ⬅️ para líneas ortogonales
  Position,
  type EdgeProps,
} from "reactflow";
import type { DomainMultiplicity } from "@/lib/api/domain-model";
import { renderMultiplicity } from "./utils";

type EdgeData = {
  selected?: boolean;
  sourceMultiplicity: DomainMultiplicity;
  targetMultiplicity: DomainMultiplicity;
};

const BADGE_OFFSET = 18;
const BADGE_Y_SHIFT = 12;

function badgePos(x: number, y: number, pos?: Position) {
  switch (pos) {
    case Position.Left:
      return { x: x - BADGE_OFFSET, y: y - BADGE_Y_SHIFT };
    case Position.Right:
      return { x: x + BADGE_OFFSET, y: y - BADGE_Y_SHIFT };
    case Position.Top:
      return { x, y: y - BADGE_OFFSET - BADGE_Y_SHIFT };
    case Position.Bottom:
      return { x, y: y + BADGE_OFFSET - BADGE_Y_SHIFT };
    default:
      return { x, y };
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
  markerEnd,
  style,
}: EdgeProps<EdgeData>) {
  // camino ortogonal (step) con bordes suaves
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

  const badgeCls =
    "rounded px-1.5 py-[1px] text-[10px] font-semibold ring-1 shadow-sm select-none";
  const badgeSelected = "bg-blue-100 text-blue-900 ring-blue-200";
  const badgeNormal = "bg-white text-gray-700 ring-gray-200";

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
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
