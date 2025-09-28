// UMLNotationLegend.tsx
"use client";
import React, { useMemo, useState } from "react";

export const CLASS_ITEM_IDS = ["class", "abstract-class", "interface", "enumeration"] as const;
export type UMLClassItemId = typeof CLASS_ITEM_IDS[number];

export const RELATION_ITEM_IDS = [
  "association",
  "aggregation",
  "composition",
  "generalization",
  "realization",
  "dependency",
  "link",
  "manyToManyJoin"
] as const;
export type UMLRelationItemId = typeof RELATION_ITEM_IDS[number];

export type UMLNotationItemId = UMLClassItemId | UMLRelationItemId;

type Props = {
  onItemActivate: (id: UMLNotationItemId) => void;
  activeItemId: UMLNotationItemId | null;
};

// Etiquetas
const CLASS_LABEL: Record<UMLClassItemId, { title: string; desc?: string }> = {
  class: { title: "Clase", desc: "Elemento concreto con atributos/operaciones." },
  "abstract-class": { title: "Clase abstracta", desc: "No puede instanciarse directamente." },
  interface: { title: "Interfaz", desc: "Contrato con estereotipo interface." },
  enumeration: { title: "Enumeracion", desc: "Lista finita de valores." },
};

const REL_LABEL: Record<UMLRelationItemId, { title: string; desc?: string }> = {
  association: { title: "Asociacion", desc: "Union estructural simple." },
  aggregation: { title: "Agregacion", desc: "Todo-parte independiente." },
  composition: { title: "Composicion", desc: "Todo-parte con ciclo de vida compartido." },
  generalization: { title: "Generalizacion", desc: "Herencia clase padre/hija." },
  realization: { title: "Realizacion", desc: "Implementacion de una interfaz." },
  dependency: { title: "Dependencia", desc: "Acoplamiento ligero no estructural." },
  link: { title: "Vinculo (sin flechas)", desc: "Conexion sin direccion; linea simple." },
  manyToManyJoin:{ title: "Muchos a muchos (clase intermedia)", desc: "Crea una clase intermedia y dos relaciones 0..*→1." },
};

// ===== Mini-graficos (SVG) =====
const stroke = "#64748b"; // gray-500
const thick = 1.6;

function GlyphClass() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <rect x="2.5" y="2.5" rx="3" width="51" height="29" fill="white" stroke={stroke} strokeWidth={thick} />
      <line x1="3.5" x2="52.5" y1="11.5" y2="11.5" stroke={stroke} strokeWidth={thick} />
      <line x1="3.5" x2="52.5" y1="20.5" y2="20.5" stroke={stroke} strokeWidth={thick} />
    </svg>
  );
}
function GlyphAbstract() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <rect x="2.5" y="2.5" rx="3" width="51" height="29" fill="white" stroke={stroke} strokeWidth={thick} />
      <line x1="3.5" x2="52.5" y1="11.5" y2="11.5" stroke={stroke} strokeWidth={thick} />
      <line x1="3.5" x2="52.5" y1="20.5" y2="20.5" stroke={stroke} strokeWidth={thick} />
      {/* marca cursiva */}
      <line x1="10" x2="22" y1="7" y2="7" stroke={stroke} strokeWidth={1} />
      <line x1="12" x2="24" y1="9" y2="9" stroke={stroke} strokeWidth={1} />
    </svg>
  );
}
function GlyphInterface() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <rect x="2.5" y="2.5" rx="3" width="51" height="29" fill="white" stroke={stroke} strokeWidth={thick} />
      {/* <<interface>> */}
      <rect x="5" y="5" width="21" height="10" rx="2" fill="white" stroke={stroke} strokeWidth={1} />
      <line x1="3.5" x2="52.5" y1="17" y2="17" stroke={stroke} strokeWidth={thick} />
    </svg>
  );
}
function GlyphEnum() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <rect x="2.5" y="2.5" rx="3" width="51" height="29" fill="white" stroke={stroke} strokeWidth={thick} />
      {/* bullets */}
      {[9, 15, 21].map((y) => (
        <g key={y}>
          <circle cx="8" cy={y} r="1.6" fill={stroke} />
          <line x1="12" x2="48" y1={y} y2={y} stroke={stroke} strokeWidth={1.2} />
        </g>
      ))}
    </svg>
  );
}

function Diamond({ filled = false }: { filled?: boolean }) {
  return (
    <polygon
      points="8,17 14,20 20,17 14,14"
      fill={filled ? stroke : "white"}
      stroke={stroke}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  );
}
function HollowTriangle() {
  return (
    <polygon
      points="44,17 54,22 54,12"
      fill="white"
      stroke={stroke}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  );
}
function ArrowHead() {
  return <polyline points="48,17 54,14 54,20 48,17" fill="none" stroke={stroke} strokeWidth={1.4} />;
}

function Line({ dashed = false }: { dashed?: boolean }) {
  return (
    <line
      x1="16"
      y1="17"
      x2="46"
      y2="17"
      stroke={stroke}
      strokeWidth={1.6}
      strokeDasharray={dashed ? "4 3" : undefined}
      strokeLinecap="round"
    />
  );
}

function GlyphAssociation() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <line x1="6" y1="17" x2="50" y2="17" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <ArrowHead />
    </svg>
  );
}
function GlyphAggregation() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <Diamond />
      <Line />
      <ArrowHead />
    </svg>
  );
}
function GlyphComposition() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <Diamond filled />
      <Line />
      <ArrowHead />
    </svg>
  );
}
function GlyphGeneralization() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <line x1="6" y1="17" x2="46" y2="17" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <HollowTriangle />
    </svg>
  );
}
function GlyphRealization() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <Line dashed />
      <HollowTriangle />
    </svg>
  );
}
function GlyphDependency() {
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <Line dashed />
      <ArrowHead />
    </svg>
  );
}
function GlyphLink() {
  // línea simple sin cabezas
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
      <line x1="8" y1="17" x2="48" y2="17" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function Glyph({ id }: { id: UMLNotationItemId }) {
  switch (id) {
    // clases
    case "class":
      return <GlyphClass />;
    case "abstract-class":
      return <GlyphAbstract />;
    case "interface":
      return <GlyphInterface />;
    case "enumeration":
      return <GlyphEnum />;
    // relaciones
    case "association":
      return <GlyphAssociation />;
    case "aggregation":
      return <GlyphAggregation />;
    case "composition":
      return <GlyphComposition />;
    case "generalization":
      return <GlyphGeneralization />;
    case "realization":
      return <GlyphRealization />;
    case "dependency":
      return <GlyphDependency />;
    case "link":
      return <GlyphLink />;
    default:
      return null;
  }
}

// ===== Row con imagen + texto =====
function Row({
  id,
  active,
  title,
  desc,
  onClick,
}: {
  id: UMLNotationItemId;
  active: boolean;
  title: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded border px-3 py-2 text-left transition flex items-center gap-3",
        active ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200",
      ].join(" ")}
    >
      <div className="shrink-0 rounded-md bg-white">
        <Glyph id={id} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {desc ? <p className="text-xs text-gray-600">{desc}</p> : null}
      </div>
    </button>
  );
}

export default function UMLNotationLegend({ onItemActivate, activeItemId }: Props) {
  const [tab, setTab] = useState<"elementos" | "relaciones">("elementos");

  const items = useMemo(() => {
    if (tab === "elementos") {
      return CLASS_ITEM_IDS.map((id) => ({
        id,
        title: CLASS_LABEL[id].title,
        desc: CLASS_LABEL[id].desc,
      }));
    }
    return RELATION_ITEM_IDS.map((id) => ({
      id,
      title: REL_LABEL[id].title,
      desc: REL_LABEL[id].desc,
    }));
  }, [tab]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Card cabecera */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Notacion UML 2.5</h3>
        <p className="text-xs text-gray-600">Referencia rapida de los simbolos usados en el tablero.</p>
      </div>

      {/* Tabs + contenido scrolleable */}
      <div className="flex-1 min-h-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab("elementos")}
            className={[
              "rounded px-3 py-1 text-xs font-semibold",
              tab === "elementos"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100",
            ].join(" ")}
          >
            Elementos
          </button>
          <button
            type="button"
            onClick={() => setTab("relaciones")}
            className={[
              "rounded px-3 py-1 text-xs font-semibold",
              tab === "relaciones"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100",
            ].join(" ")}
          >
            Relaciones
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {items.map(({ id, title, desc }) => (
            <Row
              key={id}
              id={id as UMLNotationItemId}
              active={activeItemId === (id as UMLNotationItemId)}
              title={title}
              desc={desc}
              onClick={() => onItemActivate(id as UMLNotationItemId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
