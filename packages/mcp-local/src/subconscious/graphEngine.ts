/**
 * Graph Engine — knowledge graph operations on existing object_nodes + object_edges tables.
 *
 * Reuses the existing schema (no new tables). Adds BFS traversal,
 * entity resolution, and contradiction detection.
 *
 * Entity types follow Parselyfi's LINKUP_COMPANY_SCHEMA pattern:
 * company, person, initiative, packet, decision, event, concept, requirement.
 */

import { getDb, genId } from "../db.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type EntityType =
  | "company" | "person" | "initiative" | "packet"
  | "decision" | "event" | "concept" | "requirement";

export type RelationType =
  | "related_to" | "caused_by" | "supports" | "contradicts"
  | "follows" | "references" | "part_of" | "derived_from"
  | "competes_with" | "leads" | "offers" | "announced";

export interface GraphEntity {
  id: string;
  kind: EntityType;
  label: string;
  source: string;
  status: "active" | "archived";
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  edgeType: RelationType;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TraversalResult {
  entity: GraphEntity;
  hopDistance: number;
  path: GraphEdge[];
  reachedVia: RelationType;
  confidence: number;
}

export interface GraphSummary {
  totalEntities: number;
  totalEdges: number;
  entitiesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  recentEntities: Array<{ label: string; kind: string; updatedAt: string }>;
}

// ── Entity CRUD ────────────────────────────────────────────────────────────

export function upsertEntity(
  label: string,
  kind: EntityType,
  source: string,
  properties: Record<string, unknown> = {}
): GraphEntity {
  const db = getDb();
  const id = genId("ent");

  // Check if entity with same label + kind exists
  const existing = db
    .prepare("SELECT * FROM object_nodes WHERE label = ? AND kind = ?")
    .get(label, kind) as any;

  if (existing) {
    // Merge properties
    const existingProps = JSON.parse(existing.metadata_json || "{}");
    const mergedProps = { ...existingProps, ...properties };
    const mentionCount = (existingProps._mentionCount || 0) + 1;
    mergedProps._mentionCount = mentionCount;

    db.prepare(
      `UPDATE object_nodes SET metadata_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(mergedProps), existing.id);

    return rowToEntity(
      db.prepare("SELECT * FROM object_nodes WHERE id = ?").get(existing.id) as any
    );
  }

  // Create new
  properties._mentionCount = 1;
  db.prepare(
    `INSERT INTO object_nodes (id, kind, label, source, status, metadata_json)
     VALUES (?, ?, ?, ?, 'active', ?)`
  ).run(id, kind, label, source, JSON.stringify(properties));

  return rowToEntity(
    db.prepare("SELECT * FROM object_nodes WHERE id = ?").get(id) as any
  );
}

export function findEntity(label: string, kind?: EntityType): GraphEntity | null {
  const db = getDb();
  let row: any;
  if (kind) {
    row = db
      .prepare("SELECT * FROM object_nodes WHERE label = ? AND kind = ?")
      .get(label, kind);
  } else {
    row = db
      .prepare("SELECT * FROM object_nodes WHERE label = ? ORDER BY updated_at DESC LIMIT 1")
      .get(label);
  }
  return row ? rowToEntity(row) : null;
}

export function searchEntities(query: string, limit: number = 10): GraphEntity[] {
  const db = getDb();
  // Try FTS5 first
  try {
    const rows = db
      .prepare(
        `SELECT n.* FROM object_nodes_fts fts
         JOIN object_nodes n ON n.rowid = fts.rowid
         WHERE object_nodes_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(query, limit) as any[];
    return rows.map(rowToEntity);
  } catch {
    // Fallback to LIKE
    const rows = db
      .prepare(
        `SELECT * FROM object_nodes
         WHERE label LIKE ? OR metadata_json LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(`%${query}%`, `%${query}%`, limit) as any[];
    return rows.map(rowToEntity);
  }
}

export function resolveEntity(nameOrId: string): GraphEntity | null {
  const db = getDb();
  // Try by ID
  let row = db.prepare("SELECT * FROM object_nodes WHERE id = ?").get(nameOrId) as any;
  if (row) return rowToEntity(row);
  // Try by exact label
  row = db
    .prepare("SELECT * FROM object_nodes WHERE label = ? ORDER BY updated_at DESC LIMIT 1")
    .get(nameOrId) as any;
  if (row) return rowToEntity(row);
  // Try fuzzy
  const results = searchEntities(nameOrId, 1);
  return results.length > 0 ? results[0] : null;
}

// ── Edge CRUD ──────────────────────────────────────────────────────────────

export function addEdge(
  fromId: string,
  toId: string,
  edgeType: RelationType,
  confidence: number = 0.8,
  metadata: Record<string, unknown> = {}
): GraphEdge | null {
  const db = getDb();
  const id = genId("edge");
  try {
    db.prepare(
      `INSERT OR IGNORE INTO object_edges (id, from_id, to_id, edge_type, confidence, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fromId, toId, edgeType, confidence, JSON.stringify(metadata));
    const row = db.prepare("SELECT * FROM object_edges WHERE id = ?").get(id) as any;
    return row ? rowToEdge(row) : null;
  } catch {
    return null;
  }
}

export function getEdgesFrom(entityId: string, relationFilter?: RelationType[]): GraphEdge[] {
  const db = getDb();
  if (relationFilter && relationFilter.length > 0) {
    const placeholders = relationFilter.map(() => "?").join(",");
    return (
      db
        .prepare(
          `SELECT * FROM object_edges WHERE from_id = ? AND edge_type IN (${placeholders})`
        )
        .all(entityId, ...relationFilter) as any[]
    ).map(rowToEdge);
  }
  return (
    db.prepare("SELECT * FROM object_edges WHERE from_id = ?").all(entityId) as any[]
  ).map(rowToEdge);
}

export function getEdgesTo(entityId: string, relationFilter?: RelationType[]): GraphEdge[] {
  const db = getDb();
  if (relationFilter && relationFilter.length > 0) {
    const placeholders = relationFilter.map(() => "?").join(",");
    return (
      db
        .prepare(
          `SELECT * FROM object_edges WHERE to_id = ? AND edge_type IN (${placeholders})`
        )
        .all(entityId, ...relationFilter) as any[]
    ).map(rowToEdge);
  }
  return (
    db.prepare("SELECT * FROM object_edges WHERE to_id = ?").all(entityId) as any[]
  ).map(rowToEdge);
}

// ── BFS Graph Traversal ────────────────────────────────────────────────────

export function traverseGraph(
  startEntityId: string,
  maxDepth: number = 2,
  relationFilter?: RelationType[]
): TraversalResult[] {
  const visited = new Set<string>();
  const queue: Array<{ entityId: string; depth: number; path: GraphEdge[] }> = [
    { entityId: startEntityId, depth: 0, path: [] },
  ];
  const results: TraversalResult[] = [];
  const db = getDb();

  while (queue.length > 0) {
    const { entityId, depth, path } = queue.shift()!;
    if (depth > maxDepth || visited.has(entityId)) continue;
    visited.add(entityId);

    // Get both outgoing and incoming edges
    const outEdges = getEdgesFrom(entityId, relationFilter);
    const inEdges = getEdgesTo(entityId, relationFilter);
    const allEdges = [
      ...outEdges.map((e) => ({ edge: e, neighborId: e.toId })),
      ...inEdges.map((e) => ({ edge: e, neighborId: e.fromId })),
    ];

    for (const { edge, neighborId } of allEdges) {
      if (visited.has(neighborId)) continue;
      const newPath = [...path, edge];
      const entityRow = db
        .prepare("SELECT * FROM object_nodes WHERE id = ?")
        .get(neighborId) as any;
      if (!entityRow) continue;

      results.push({
        entity: rowToEntity(entityRow),
        hopDistance: depth + 1,
        path: newPath,
        reachedVia: edge.edgeType as RelationType,
        confidence: newPath.reduce((acc, e) => acc * e.confidence, 1),
      });

      if (depth + 1 < maxDepth) {
        queue.push({ entityId: neighborId, depth: depth + 1, path: newPath });
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Find all entities connected by "contradicts" edges within N hops.
 */
export function findContradictions(entityId: string, maxDepth: number = 2): TraversalResult[] {
  return traverseGraph(entityId, maxDepth, ["contradicts"]);
}

/**
 * Trace derivation chain: derived_from → part_of → caused_by
 */
export function traceLineage(entityId: string, maxDepth: number = 5): TraversalResult[] {
  return traverseGraph(entityId, maxDepth, ["derived_from", "part_of", "caused_by"]);
}

// ── Summary ────────────────────────────────────────────────────────────────

export function getGraphSummary(): GraphSummary {
  const db = getDb();
  const totalEntities = (
    db.prepare("SELECT COUNT(*) as c FROM object_nodes").get() as any
  ).c;
  const totalEdges = (
    db.prepare("SELECT COUNT(*) as c FROM object_edges").get() as any
  ).c;

  const kindCounts = db
    .prepare("SELECT kind, COUNT(*) as c FROM object_nodes GROUP BY kind")
    .all() as any[];
  const entitiesByType: Record<string, number> = {};
  for (const row of kindCounts) entitiesByType[row.kind] = row.c;

  const edgeTypeCounts = db
    .prepare("SELECT edge_type, COUNT(*) as c FROM object_edges GROUP BY edge_type")
    .all() as any[];
  const edgesByType: Record<string, number> = {};
  for (const row of edgeTypeCounts) edgesByType[row.edge_type] = row.c;

  const recent = db
    .prepare(
      "SELECT label, kind, updated_at FROM object_nodes ORDER BY updated_at DESC LIMIT 10"
    )
    .all() as any[];

  return {
    totalEntities,
    totalEdges,
    entitiesByType,
    edgesByType,
    recentEntities: recent.map((r: any) => ({
      label: r.label,
      kind: r.kind,
      updatedAt: r.updated_at,
    })),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToEntity(row: any): GraphEntity {
  return {
    id: row.id,
    kind: row.kind as EntityType,
    label: row.label,
    source: row.source,
    status: row.status as "active" | "archived",
    properties: JSON.parse(row.metadata_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEdge(row: any): GraphEdge {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    edgeType: row.edge_type as RelationType,
    confidence: row.confidence,
    metadata: JSON.parse(row.metadata_json || "{}"),
    createdAt: row.created_at,
  };
}
