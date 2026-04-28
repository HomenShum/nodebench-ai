/**
 * Knowledge graph and entity context tools for external agents.
 * Proxies Convex queries from the knowledge domain.
 */

import { convexQuery } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const knowledgeTools: McpTool[] = [
  {
    name: "searchEntityContexts",
    description:
      "Search entity contexts by keyword. Returns entity profiles with summaries, tags, sectors, and relationship data.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for entity names or descriptions",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/entityContexts:searchEntityContexts",
        { query: args.query, limit: args.limit }
      );
    },
  },
  {
    name: "getEntityContext",
    description:
      "Get full entity context by ID, including all tracked metadata, relationships, funding data, and activity history.",
    inputSchema: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "Convex ID of the entity context",
        },
      },
      required: ["entityId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/entityContexts:getEntityContext",
        { entityId: args.entityId }
      );
    },
  },
  {
    name: "getEntityContextByName",
    description:
      "Look up an entity context by its canonical name (exact match).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Canonical name of the entity",
        },
      },
      required: ["name"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/entityContexts:getEntityContextByName",
        { name: args.name }
      );
    },
  },
  {
    name: "listEntityContexts",
    description:
      "List all tracked entity contexts with pagination. Useful for browsing the knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max entities to return (default 20)",
        },
        entityType: {
          type: "string",
          description: "Filter by type (company, person, etc.)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/entityContexts:listEntityContexts",
        { limit: args.limit, entityType: args.entityType }
      );
    },
  },
  {
    name: "getEntityContextStats",
    description:
      "Get aggregate statistics about the knowledge base: total entities, entities by type, coverage metrics.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/knowledge/entityContexts:getEntityContextStats",
        {}
      );
    },
  },
  {
    name: "getKnowledgeGraph",
    description:
      "Get a knowledge graph by source document, including nodes, edges, and claims.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: {
          type: "string",
          description: "Source document ID",
        },
      },
      required: ["sourceId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/knowledgeGraph:getGraphBySource",
        { sourceId: args.sourceId }
      );
    },
  },
  {
    name: "getKnowledgeGraphClaims",
    description:
      "Get all claims extracted from a knowledge graph, useful for fact-checking and verification.",
    inputSchema: {
      type: "object",
      properties: {
        graphId: {
          type: "string",
          description: "Convex ID of the knowledge graph",
        },
      },
      required: ["graphId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/knowledgeGraph:getGraphClaims",
        { graphId: args.graphId }
      );
    },
  },
  {
    name: "getSourceRegistry",
    description:
      "Get the source registry for a domain, showing all tracked data sources with freshness and reliability scores.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to query (e.g. 'funding', 'news', 'social')",
        },
      },
      required: ["domain"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/knowledge/sourceRegistry:getRegistryForDomain",
        { domain: args.domain }
      );
    },
  },
];
