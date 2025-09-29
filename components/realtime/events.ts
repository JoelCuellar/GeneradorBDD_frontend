export type PresencePayload = {
  projectId: string;
  cursor?: { x: number; y: number } | null;
  selection?: string | null;
};

export type NodeMove = { projectId: string; classId: string; x: number; y: number };
export type EdgeAnchor = { projectId: string; relationId: string; sourceHandle?: string | null; targetHandle?: string | null };

export const RT_EVENTS = {
  JOIN: 'join',
  JOINED: 'joined',
  PRESENCE: 'presence',
  NODE_MOVE: 'node_move',
  NODE_MOVE_COMMIT: 'node_move_commit',
  EDGE_ANCHOR: 'edge_anchor',

  CLASS_CREATED: 'class_created',
  CLASS_UPDATED: 'class_updated',
  CLASS_DELETED: 'class_deleted',

  REL_CREATED: 'relation_created',
  REL_UPDATED: 'relation_updated',
  REL_DELETED: 'relation_deleted',
} as const;
