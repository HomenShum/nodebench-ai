/**
 * Intelligence Graph MCP tools — Bloomberg-style entity/people/investor operations.
 * Proxies Convex queries/mutations from domains/intelligence/operations.
 */

import { convexQuery, convexMutation } from "../convexClient.js";

import type { McpTool } from "./researchTools.js";

export const intelligenceTools: McpTool[] = [
  {
    name: "getEntity",
    description: "Get a canonical entity by its entityKey.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
      },
      required: ["entityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getEntity",
        { entityKey: args.entityKey },
      );
    },
  },
  {
    name: "resolveAlias",
    description:
      "Resolve an alias (name, ticker, CUSIP, ISIN) to its canonical entity.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Alias string to resolve" },
      },
      required: ["alias"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:resolveAlias",
        { alias: args.alias },
      );
    },
  },
  {
    name: "searchEntities",
    description:
      "Search entities by type, sector, or country. Returns up to 50 results.",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: ["company", "subsidiary", "person", "fund", "investor", "product", "facility", "organization", "other"],
        },
        sector: { type: "string" },
        countryCode: { type: "string" },
        limit: { type: "number" },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:searchEntities",
        args,
      );
    },
  },
  {
    name: "getEntityNetwork",
    description:
      "Get the full network graph for an entity: aliases, holdings, people, investors, and related entities.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Entity to expand" },
      },
      required: ["entityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getEntityNetwork",
        { entityKey: args.entityKey },
      );
    },
  },
  {
    name: "getPersonProfile",
    description:
      "Get executive/person profile with employment history, board roles, and credibility score.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string" },
      },
      required: ["entityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getPersonProfile",
        { entityKey: args.entityKey },
      );
    },
  },
  {
    name: "getInvestorProfile",
    description:
      "Get investor profile with type, AUM, focus sectors, portfolio size.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string" },
      },
      required: ["entityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getInvestorProfile",
        { entityKey: args.entityKey },
      );
    },
  },
  {
    name: "getHoldings",
    description: "Get all fund holdings for a given investor entity.",
    inputSchema: {
      type: "object",
      properties: {
        holderEntityKey: { type: "string" },
      },
      required: ["holderEntityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getHoldings",
        { holderEntityKey: args.holderEntityKey },
      );
    },
  },
  {
    name: "getStakeholderGraph",
    description:
      "Get the stakeholder analysis graph: actors, goals, fears, incentives, and incentive interpretations.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string" },
      },
      required: ["entityKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/intelligence/operations:getStakeholderGraph",
        { entityKey: args.entityKey },
      );
    },
  },
  {
    name: "upsertEntity",
    description:
      "Create or update a canonical entity record (company, person, fund, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string" },
        canonicalName: { type: "string" },
        entityType: {
          type: "string",
          enum: ["company", "subsidiary", "person", "fund", "investor", "product", "facility", "organization", "other"],
        },
        status: {
          type: "string",
          enum: ["active", "inactive", "acquired", "dissolved", "unknown"],
        },
        description: { type: "string" },
        sector: { type: "string" },
        headquarters: { type: "string" },
        countryCode: { type: "string" },
      },
      required: ["entityKey", "canonicalName", "entityType"],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/intelligence/operations:upsertEntity",
        args,
      );
    },
  },
];
