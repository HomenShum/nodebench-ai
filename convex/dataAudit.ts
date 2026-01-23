import { query } from "./_generated/server";

export const auditData = query({
  args: {},
  handler: async (ctx) => {
    // Check various data sources
    const feedItems = await ctx.db.query("feedItems").take(5);
    const blips = await ctx.db.query("blips").take(5);
    const fundingRounds = await ctx.db.query("fundingRounds").take(5);
    const entities = await ctx.db.query("entities").take(5);
    const documents = await ctx.db.query("documents").take(5);
    const agentRuns = await ctx.db.query("agentRuns").take(5);
    const threads = await ctx.db.query("fastAgentThreads").take(5);

    return {
      feedItems: feedItems.length,
      blips: blips.length,
      fundingRounds: fundingRounds.length,
      entities: entities.length,
      documents: documents.length,
      agentRuns: agentRuns.length,
      threads: threads.length,
      sampleFeedItem: feedItems[0],
      sampleBlip: blips[0],
      sampleEntity: entities[0],
      sampleDocument: documents[0],
    };
  },
});
