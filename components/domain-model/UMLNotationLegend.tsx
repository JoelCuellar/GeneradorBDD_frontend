"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

export const CLASS_ITEM_IDS = ["class", "abstract-class", "interface", "enumeration"] as const;
export const RELATION_ITEM_IDS = [
  "association",
  "aggregation",
  "composition",
  "generalization",
  "realization",
  "dependency",
] as const;

export type UMLClassItemId = (typeof CLASS_ITEM_IDS)[number];
export type UMLRelationItemId = (typeof RELATION_ITEM_IDS)[number];
export type UMLNotationItemId = UMLClassItemId | UMLRelationItemId;

type UMLNotationItemKind = "class" | "relation";

type UMLNotationItem = {
  id: UMLNotationItemId;
  kind: UMLNotationItemKind;
  title: string;
  description: string;
  figure: ReactNode;
};

type UMLNotationSection = {
  id: string;
  title: string;
  items: UMLNotationItem[];
};

const CLASS_ITEMS: UMLNotationItem[] = [
  {
    id: "class",
    kind: "class",
    title: "Clase",
    description: "Elemento concreto con compartimentos para atributos y operaciones.",
    figure: (
      <div className="w-20 overflow-hidden rounded border border-gray-400 bg-white text-[9px] text-gray-700 shadow-sm">
        <div className="border-b border-gray-300 px-1 py-[2px] text-center font-semibold">Clase</div>
        <div className="border-b border-gray-300 px-1 py-[2px] text-left">atributo: Tipo</div>
        <div className="px-1 py-[2px] text-left italic text-gray-500">operacion()</div>
      </div>
    ),
  },
  {
    id: "abstract-class",
    kind: "class",
    title: "Clase abstracta",
    description: "Nombre en cursiva. No puede instanciarse directamente.",
    figure: (
      <div className="w-20 overflow-hidden rounded border border-gray-400 bg-white text-[9px] text-gray-700 shadow-sm">
        <div className="border-b border-gray-300 px-1 py-[2px] text-center italic text-gray-600">ClaseBase</div>
        <div className="border-b border-gray-300 px-1 py-[2px] text-left">+ atributo</div>
        <div className="px-1 py-[2px] text-left italic text-gray-500"># metodo()</div>
      </div>
    ),
  },
  {
    id: "interface",
    kind: "class",
    title: "Interfaz",
    description: "Contrato con estereotipo interface.",
    figure: (
      <div className="w-20 overflow-hidden rounded border border-gray-400 bg-white text-[9px] text-gray-700 shadow-sm">
        <div className="border-b border-gray-300 px-1 py-[2px] text-center text-[8px] text-gray-500">
          &lt;&lt;interface&gt;&gt;
        </div>
        <div className="border-b border-gray-300 px-1 py-[2px] text-center font-semibold">Servicio</div>
        <div className="px-1 py-[2px] text-left italic text-gray-500">+ operar()</div>
      </div>
    ),
  },
  {
    id: "enumeration",
    kind: "class",
    title: "Enumeracion",
    description: "Lista finita de valores posibles.",
    figure: (
      <div className="w-20 overflow-hidden rounded border border-gray-400 bg-white text-[9px] text-gray-700 shadow-sm">
        <div className="border-b border-gray-300 px-1 py-[2px] text-center text-[8px] text-gray-500">
          &lt;&lt;enumeration&gt;&gt;
        </div>
        <div className="border-b border-gray-300 px-1 py-[2px] text-center font-semibold">Estado</div>
        <div className="px-1 text-left text-gray-600">- NUEVO</div>
        <div className="px-1 pb-1 text-left text-gray-600">- APROBADO</div>
      </div>
    ),
  },
];

const RELATION_ITEMS: UMLNotationItem[] = [
  {
    id: "association",
    kind: "relation",
    title: "Asociacion",
    description: "Union estructural simple entre clases.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <line x1="8" y1="16" x2="74" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <polygon points="74,16 64,10 64,22" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "aggregation",
    kind: "relation",
    title: "Agregacion",
    description: "Relacion todo-parte con ciclo de vida independiente.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <polygon points="12,16 20,10 28,16 20,22" fill="white" stroke="currentColor" strokeWidth="2" />
        <line x1="28" y1="16" x2="78" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "composition",
    kind: "relation",
    title: "Composicion",
    description: "Relacion todo-parte con ciclo de vida compartido.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <polygon points="12,16 20,10 28,16 20,22" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <line x1="28" y1="16" x2="78" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "generalization",
    kind: "relation",
    title: "Generalizacion",
    description: "Herencia entre clase hija y padre.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <line x1="8" y1="16" x2="66" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <polygon points="66,16 54,10 54,22" fill="white" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "realization",
    kind: "relation",
    title: "Realizacion",
    description: "Implementacion de una interfaz por una clase.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <line
          x1="8"
          y1="16"
          x2="66"
          y2="16"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="butt"
        />
        <polygon points="66,16 54,10 54,22" fill="white" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "dependency",
    kind: "relation",
    title: "Dependencia",
    description: "Acoplamiento ligero no estructural.",
    figure: (
      <svg viewBox="0 0 90 32" className="h-8 w-20 text-gray-700" aria-hidden="true">
        <line
          x1="12"
          y1="16"
          x2="70"
          y2="16"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
          strokeLinecap="butt"
        />
        <polygon points="70,16 60,11 60,21" fill="currentColor" />
      </svg>
    ),
  },
];

const UML_NOTATION_SECTIONS: UMLNotationSection[] = [
  { id: "classes", title: "Elementos de clase", items: CLASS_ITEMS },
  { id: "relations", title: "Relaciones", items: RELATION_ITEMS },
];

type UMLNotationLegendProps = {
  onItemActivate?: (itemId: UMLNotationItemId, itemKind: UMLNotationItemKind) => void;
  activeItemId?: UMLNotationItemId | null;
};

export default function UMLNotationLegend({ onItemActivate, activeItemId = null }: UMLNotationLegendProps) {
  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Notacion UML 2.5</h2>
        <p className="text-xs text-gray-500">Referencia rapida de los simbolos usados en el tablero.</p>
      </header>
      <div className="space-y-4">
        {UML_NOTATION_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase text-gray-500">{section.title}</h3>
            <ul className="mt-3 space-y-3">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onItemActivate?.(item.id, item.kind)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-lg border border-transparent bg-transparent p-2 text-left transition focus:outline-none focus-visible:ring focus-visible:ring-blue-200 focus-visible:ring-offset-0",
                      activeItemId === item.id
                        ? "border-blue-300 bg-blue-50"
                        : "hover:border-blue-200 hover:bg-blue-50",
                    )}
                  >
                    <div className="flex h-12 w-20 items-center justify-center rounded border border-gray-300 bg-gray-50 p-1">
                      {item.figure}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
