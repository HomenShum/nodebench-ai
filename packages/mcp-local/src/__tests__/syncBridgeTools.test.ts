import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

import { syncBridgeTools } from "../tools/syncBridgeTools.js";

function getTool(name: string) {
  const tool = syncBridgeTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("syncBridgeTools", () => {
  let httpServer: ReturnType<typeof createServer>;
  let wss: WebSocketServer;
  let bridgeUrl = "";

  beforeAll(async () => {
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws) => {
      ws.on("message", (raw) => {
        const message = JSON.parse(String(raw)) as any;
        if (message.type === "pair_device") {
          ws.send(JSON.stringify({
            type: "paired",
            id: "paired_1",
            timestamp: new Date().toISOString(),
            payload: {
              deviceToken: "devtok_test",
              deviceId: message.payload.deviceId,
              userId: "user_sync_test",
              workspaceId: "ws_sync_test",
              scopesGranted: message.payload.requestedScopes ?? ["metadata_only"],
              pairedAt: new Date().toISOString(),
              syncEnabled: true,
            },
          }));
          return;
        }

        if (message.type === "sync_batch") {
          const acceptedIds = Array.isArray(message.payload.operations)
            ? message.payload.operations.map((operation: { id: string }) => operation.id)
            : [];
          ws.send(JSON.stringify({
            type: "sync_ack",
            id: "ack_1",
            timestamp: new Date().toISOString(),
            payload: {
              acceptedIds,
              rejected: [],
              serverWatermark: "sync_watermark_1",
            },
          }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to resolve test sync bridge address");
    }
    bridgeUrl = `ws://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      wss.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("stores durable objects, queues receipts, and flushes them over the outbound bridge", async () => {
    const upsertObject = getTool("upsert_durable_object");
    const recordReceipt = getTool("record_provenance_receipt");
    const flush = getTool("run_sync_bridge_flush");
    const status = getTool("get_sync_bridge_status");

    await upsertObject.handler({
      id: "run:sync_test",
      kind: "run",
      label: "Sync test run",
    });

    await recordReceipt.handler({
      runId: "sync_test",
      objectId: "run:sync_test",
      actionType: "test_receipt",
      summary: "Local receipt queued for sync",
      input: { foo: "bar" },
      output: { ok: true },
    });

    const result = await flush.handler({
      bridgeUrl,
      pairingCode: "pair_dev_test",
      deviceId: "device_sync_test",
      deviceName: "Sync Test Device",
      requestedScopes: ["metadata_only", "receipts_and_traces"],
      limit: 20,
    }) as any;

    expect(result.acceptedIds.length).toBeGreaterThan(0);
    expect(result.rejected).toEqual([]);

    const snapshot = await status.handler({ deviceId: "device_sync_test" }) as any;
    expect(snapshot.mode).toBe("connected");
    expect(snapshot.acknowledgedCount).toBeGreaterThan(0);
  });
});
