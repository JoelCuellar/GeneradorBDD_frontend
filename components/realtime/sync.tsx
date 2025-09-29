"use client";

import { useEffect } from "react";
import { useRealtime } from "./RealtimeProvider";
import { RT_EVENTS } from "@/lib/realtime/events";
import type { DomainModelSnapshot } from "@/lib/api/domain-model";

/** Escucha eventos del socket y actualiza el snapshot local (clases/relaciones). */
export function RealtimeModelSync({
  setModel,
}: {
  setModel: React.Dispatch<React.SetStateAction<DomainModelSnapshot | null>>;
}) {
  const { socket } = useRealtime();

  useEffect(() => {
    if (!socket) return;

    // helpers inmutables
    const upsert = <T extends { id: string }>(arr: T[], item: T) =>
      arr.some((a) => a.id === item.id) ? arr : [...arr, item];

    const replace = <T extends { id: string }>(arr: T[], item: T) =>
      arr.map((a) => (a.id === item.id ? item : a));

    // listeners
    const onClassCreated = (cls: any) =>
      setModel((p) => (p ? { ...p, classes: upsert(p.classes, cls) } : p));

    const onClassUpdated = (cls: any) =>
      setModel((p) => (p ? { ...p, classes: replace(p.classes, cls) } : p));

    const onClassDeleted = (id: string) =>
      setModel((p) => (p ? { ...p, classes: p.classes.filter((c) => c.id !== id) } : p));

    const onRelCreated = (rel: any) =>
      setModel((p) => (p ? { ...p, relations: upsert(p.relations, rel) } : p));

    const onRelUpdated = (rel: any) =>
      setModel((p) => (p ? { ...p, relations: replace(p.relations, rel) } : p));

    const onRelDeleted = (id: string) =>
      setModel((p) => (p ? { ...p, relations: p.relations.filter((r) => r.id !== id) } : p));

    // suscribirse
    socket.on(RT_EVENTS.CLASS_CREATED, onClassCreated);
    socket.on(RT_EVENTS.CLASS_UPDATED, onClassUpdated);
    socket.on(RT_EVENTS.CLASS_DELETED, onClassDeleted);
    socket.on(RT_EVENTS.REL_CREATED, onRelCreated);
    socket.on(RT_EVENTS.REL_UPDATED, onRelUpdated);
    socket.on(RT_EVENTS.REL_DELETED, onRelDeleted);

    // cleanup
    return () => {
      socket.off(RT_EVENTS.CLASS_CREATED, onClassCreated);
      socket.off(RT_EVENTS.CLASS_UPDATED, onClassUpdated);
      socket.off(RT_EVENTS.CLASS_DELETED, onClassDeleted);
      socket.off(RT_EVENTS.REL_CREATED, onRelCreated);
      socket.off(RT_EVENTS.REL_UPDATED, onRelUpdated);
      socket.off(RT_EVENTS.REL_DELETED, onRelDeleted);
    };
  }, [socket, setModel]);

  return null;
}

/** Publica presencia (cursor + elemento seleccionado) al resto de clientes. */
export function RealtimePresenceSync({
  selectedClassId,
  selectedRelationId,
}: {
  selectedClassId: string | null;
  selectedRelationId: string | null;
}) {
  const { updatePresence } = useRealtime();

  // Enviar cursor (con throttling sencillo)
  useEffect(() => {
    let last = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - last < 30) return; // ~33 fps
      last = now;
      updatePresence({ cursor: { x: e.clientX, y: e.clientY } });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [updatePresence]);

  // Enviar selección (clase o relación)
  useEffect(() => {
    updatePresence({
      selection: selectedRelationId ?? selectedClassId ?? null,
    });
  }, [selectedClassId, selectedRelationId, updatePresence]);

  return null;
}
