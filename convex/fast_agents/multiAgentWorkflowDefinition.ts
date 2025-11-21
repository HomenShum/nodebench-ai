import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";

const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 5 },
});

export const multiAgentOrchestration = workflow.define({
  args: {
    prompt: v.string(),
    userId: v.id("users"),
    threadId: v.optional(v.string()),
    includeMedia: v.optional(v.boolean()),
    includeFilings: v.optional(v.boolean()),
  },
  handler: async (step, args) => {
    const retryPolicy = true;

    const threadId =
      args.threadId ??
      (
        await step.runAction(
          (internal as any)["fast_agents/multiAgentWorkflow"].createCoordinatorThread,
          {
            userId: args.userId,
            title: args.prompt.slice(0, 96),
            summary: `Multi-agent workflow: ${args.prompt.slice(0, 60)}`,
          },
        )
      ).threadId;

    // Document Agent
    await step.runAction(
      (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
      {
        threadId,
        agentName: "Document Agent",
        message: "🔍 Searching documents and analyzing content...",
        emoji: "🔍",
      },
    );

    const docResult = await step.runAction(
      (internal as any)["fast_agents/multiAgentWorkflow"].documentAgentAction,
      {
        userId: args.userId,
        threadId,
        prompt: args.prompt,
      },
      { retry: retryPolicy },
    );

    if (docResult?.text) {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "Document Agent",
          message: docResult.text,
          emoji: "📄",
        },
      );
    }

    let secResult: any = null;
    let mediaResult: any = null;

    // SEC Agent
    if (args.includeFilings !== false) {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "SEC Agent",
          message: "📊 Searching SEC filings...",
          emoji: "📊",
        },
      );

      secResult = await step.runAction(
        (internal as any)["fast_agents/multiAgentWorkflow"].secAgentAction,
        {
          userId: args.userId,
          threadId,
          prompt: `Find and summarize SEC filings related to: ${args.prompt}`,
        },
        { retry: retryPolicy },
      );

      if (secResult?.text) {
        await step.runAction(
          (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
          {
            threadId,
            agentName: "SEC Agent",
            message: secResult.text,
            emoji: "📊",
          },
        );
      }
    }

    // Media Agent
    if (args.includeMedia !== false) {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "Media Agent",
          message: "🎥 Searching for videos and images...",
          emoji: "🎥",
        },
      );

      mediaResult = await step.runAction(
        (internal as any)["fast_agents/multiAgentWorkflow"].mediaAgentAction,
        {
          userId: args.userId,
          threadId,
          prompt: `Find supporting media or videos for: ${args.prompt}`,
        },
        { retry: retryPolicy },
      );

      if (mediaResult?.text) {
        await step.runAction(
          (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
          {
            threadId,
            agentName: "Media Agent",
            message: mediaResult.text,
            emoji: "🎥",
          },
        );
      }
    }

    const summaryParts = [
      docResult?.text ? `Documents:\n${docResult.text}` : null,
      secResult?.text ? `SEC Filings:\n${secResult.text}` : null,
      mediaResult?.text ? `Media:\n${mediaResult.text}` : null,
    ].filter(Boolean);

    const coordinatorPrompt =
      summaryParts.length === 0
        ? `No delegated agent returned text for: ${args.prompt}`
        : `Combine the delegated agent outputs into a concise answer for the user. Respond with short bullets and cite sources.\n\n${summaryParts.join(
            "\n\n",
      )}`;

    // Coordinator synthesis
    await step.runAction(
      (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
      {
        threadId,
        agentName: "Coordinator",
        message: "🧠 Synthesizing all findings into a comprehensive answer...",
        emoji: "🧠",
      },
    );

    const coordinatorText = await step.runAction(
      (internal as any)["fast_agents/multiAgentWorkflow"].coordinatorAction,
      {
        userId: args.userId,
        threadId,
        prompt: coordinatorPrompt,
      },
      { retry: retryPolicy },
    );

    if (coordinatorText?.text) {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "Coordinator",
          message: coordinatorText.text,
          emoji: "✨",
        },
      );
    }

    // Critic review with optional self-repair
    await step.runAction(
      (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
      {
        threadId,
        agentName: "Quality Check",
        message: "🔍 Reviewing response quality and accuracy...",
        emoji: "🔍",
      },
    );

    const critique = await step.runAction(
      (internal as any)["fast_agents/multiAgentWorkflow"].criticAction,
      {
        userId: args.userId,
        prompt: `Evaluate this response for accuracy, sourcing, and usefulness. Return pass, improvements, refinedPrompt if a better prompt would fix issues.\n\n${coordinatorText}`,
      },
      { retry: retryPolicy },
    );

    if (!critique?.object?.pass) {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "Quality Check",
          message: "⚠️ Quality check failed. Refining response...",
          emoji: "⚠️",
        },
      );

      const improvements =
        critique?.object?.improvements?.join("\n- ") || "Improve clarity and cite sources.";
      const refinedPrompt =
        critique?.object?.refinedPrompt ||
        `Rewrite the answer with the following improvements:\n- ${improvements}\nEnsure citations and concise actions.`;

      const refinedResult = await step.runAction(
        (internal as any)["fast_agents/multiAgentWorkflow"].coordinatorAction,
        {
          userId: args.userId,
          threadId,
          prompt: refinedPrompt,
        },
        { retry: retryPolicy },
      );

      if (refinedResult?.text) {
        await step.runAction(
          (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
          {
            threadId,
            agentName: "Final Answer",
            message: refinedResult.text,
            emoji: "✅",
          },
        );
      }

      // Skipping lesson persistence for now to keep types simple
    } else {
      await step.runAction(
        (internal as any)["fastAgentPanelStreaming"].saveAgentProgressMessage,
        {
          threadId,
          agentName: "Quality Check",
          message: "✅ Quality check passed! Response is ready.",
          emoji: "✅",
        },
      );
      // Skipping lesson persistence for now to keep types simple
    }
  },
});

export { workflow };
