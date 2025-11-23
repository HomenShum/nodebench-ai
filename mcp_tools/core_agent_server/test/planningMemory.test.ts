import { describe, it, expect, beforeEach, vi } from "vitest";
import { planningTools } from "../tools/planningTools";
import { memoryTools } from "../tools/memoryTools";

const createPlan = planningTools.find((t) => t.name === "createPlan")!;
const updatePlanStep = planningTools.find((t) => t.name === "updatePlanStep")!;
const getPlan = planningTools.find((t) => t.name === "getPlan")!;

const writeMemory = memoryTools.find((t) => t.name === "writeAgentMemory")!;
const readMemory = memoryTools.find((t) => t.name === "readAgentMemory")!;
const listMemory = memoryTools.find((t) => t.name === "listAgentMemory")!;
const deleteMemory = memoryTools.find((t) => t.name === "deleteAgentMemory")!;

// Reset the module state before each test to avoid cross-test contamination
beforeEach(() => {
  // Tools keep state in module-level Maps; reimporting clears them.
  vi.resetModules();
});

describe("core_agent_server tools (planning + memory)", () => {
  it("creates, updates, and retrieves a plan end-to-end", async () => {
    const create = await createPlan.handler({
      goal: "Test goal",
      steps: [
        { step: "one", status: "pending" },
        { step: "two", status: "pending" },
      ],
    });

    expect(create.success).toBe(true);
    expect(create.planId).toBeTruthy();

    const planId = create.planId as string;

    const updated = await updatePlanStep.handler({
      planId,
      stepIndex: 0,
      status: "completed",
    });
    expect(updated.success).toBe(true);

    const fetched = await getPlan.handler({ planId });
    expect(fetched.success).toBe(true);
    expect(fetched.plan.steps[0].status).toBe("completed");
  });

  it("stores, reads, lists, and deletes memory entries end-to-end", async () => {
    const write = await writeMemory.handler({
      key: "smoke_key",
      content: "hello",
      metadata: { source: "test" },
    });
    expect(write.success).toBe(true);

    const read = await readMemory.handler({ key: "smoke_key" });
    expect(read.success).toBe(true);
    expect(read.content).toBe("hello");
    expect(read.metadata?.source).toBe("test");

    const list = await listMemory.handler({});
    const keys = (list.memories || []).map((m: any) => m.key);
    expect(keys).toContain("smoke_key");

    const del = await deleteMemory.handler({ key: "smoke_key" });
    expect(del.success).toBe(true);
  });
});
