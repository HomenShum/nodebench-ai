import WebSocket from "ws";

import type {
  SyncBridgeEnvelope,
  SyncBridgePairDevicePayload,
  SyncBridgePairedPayload,
  SyncBridgeSyncAckPayload,
} from "./protocol.js";
import { createSyncEnvelope } from "./protocol.js";
import {
  acknowledgeSyncOperations,
  bindDeviceToAccount,
  failSyncOperations,
  getActiveAccountBinding,
  getDeviceBinding,
  listPendingSyncOperations,
  markSyncAttempt,
  upsertDeviceBinding,
} from "./store.js";

export interface SyncBridgeClientOptions {
  bridgeUrl: string;
  deviceId: string;
  deviceName: string;
  platform?: string;
  appVersion?: string;
  pairingCode?: string;
  deviceToken?: string;
  requestedScopes?: SyncBridgePairDevicePayload["requestedScopes"];
  wsFactory?: (url: string) => WebSocket;
  timeoutMs?: number;
}

function waitForOpen(ws: WebSocket, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Sync bridge connect timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    ws.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export class SyncBridgeClient {
  private readonly options: SyncBridgeClientOptions;
  private readonly wsFactory: (url: string) => WebSocket;
  private ws: WebSocket | null = null;

  constructor(options: SyncBridgeClientOptions) {
    this.options = options;
    this.wsFactory = options.wsFactory ?? ((url: string) => new WebSocket(url));
  }

  async flushPendingQueue(limit = 50): Promise<{
    paired: SyncBridgePairedPayload;
    acceptedIds: string[];
    rejected: Array<{ id: string; reason: string }>;
    attemptedCount: number;
  }> {
    const ws = this.wsFactory(this.options.bridgeUrl);
    this.ws = ws;
    const timeoutMs = this.options.timeoutMs ?? 10_000;
    await waitForOpen(ws, timeoutMs);

    const paired = await this.performHandshake(timeoutMs);
    const operations = listPendingSyncOperations(limit);
    if (operations.length === 0) {
      ws.close();
      return { paired, acceptedIds: [], rejected: [], attemptedCount: 0 };
    }

    const queueIds = operations.map((operation) => operation.id);
    markSyncAttempt(queueIds);

    const ack = await new Promise<SyncBridgeSyncAckPayload>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Sync bridge ack timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const message = JSON.parse(String(raw)) as SyncBridgeEnvelope;
          if (message.type === "sync_ack") {
            clearTimeout(timeout);
            ws.off("message", onMessage);
            resolve(message.payload as SyncBridgeSyncAckPayload);
          } else if (message.type === "error") {
            clearTimeout(timeout);
            ws.off("message", onMessage);
            reject(new Error((message.payload as { message?: string }).message ?? "Sync bridge error"));
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.off("message", onMessage);
          reject(error);
        }
      };

      ws.on("message", onMessage);
      ws.send(JSON.stringify(createSyncEnvelope("sync_batch", {
        deviceId: paired.deviceId,
        operations,
      })));
    }).catch((error) => {
      failSyncOperations({
        rejected: queueIds.map((id) => ({ id, reason: error instanceof Error ? error.message : String(error) })),
        deviceId: paired.deviceId,
        userId: paired.userId,
        workspaceId: paired.workspaceId,
      });
      throw error;
    });

    if (ack.acceptedIds.length > 0) {
      acknowledgeSyncOperations({
        queueIds: ack.acceptedIds,
        serverReceiptId: ack.serverWatermark,
        deviceId: paired.deviceId,
        userId: paired.userId,
        workspaceId: paired.workspaceId,
        detail: { serverWatermark: ack.serverWatermark },
      });
    }
    if (ack.rejected.length > 0) {
      failSyncOperations({
        rejected: ack.rejected,
        deviceId: paired.deviceId,
        userId: paired.userId,
        workspaceId: paired.workspaceId,
      });
    }

    ws.close();
    return {
      paired,
      acceptedIds: ack.acceptedIds,
      rejected: ack.rejected,
      attemptedCount: operations.length,
    };
  }

  private async performHandshake(timeoutMs: number): Promise<SyncBridgePairedPayload> {
    const ws = this.ws;
    if (!ws) throw new Error("Sync bridge socket is not open");

    const activeBinding = getActiveAccountBinding(this.options.deviceId);
    const deviceBinding = getDeviceBinding(this.options.deviceId);
    const payload: SyncBridgePairDevicePayload = {
      pairingCode: this.options.pairingCode,
      deviceToken: this.options.deviceToken ?? deviceBinding?.deviceToken ?? undefined,
      deviceId: this.options.deviceId,
      deviceName: this.options.deviceName,
      platform: this.options.platform,
      appVersion: this.options.appVersion,
      requestedScopes: this.options.requestedScopes ?? activeBinding?.scopes,
      workspaceId: activeBinding?.workspaceId ?? undefined,
    };

    return new Promise<SyncBridgePairedPayload>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Sync bridge pairing timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const message = JSON.parse(String(raw)) as SyncBridgeEnvelope;
          if (message.type === "paired") {
            clearTimeout(timeout);
            ws.off("message", onMessage);
            const paired = message.payload as SyncBridgePairedPayload;
            upsertDeviceBinding({
              deviceId: paired.deviceId,
              deviceName: this.options.deviceName,
              platform: this.options.platform,
              appVersion: this.options.appVersion,
              bridgeUrl: this.options.bridgeUrl,
              deviceToken: paired.deviceToken,
              bindingStatus: "paired",
            });
            if (
              !activeBinding ||
              activeBinding.userId !== paired.userId ||
              activeBinding.workspaceId !== (paired.workspaceId ?? null)
            ) {
              bindDeviceToAccount({
                deviceId: paired.deviceId,
                userId: paired.userId,
                workspaceId: paired.workspaceId,
                scopes: paired.scopesGranted,
                syncEnabled: paired.syncEnabled,
                syncMode: "connected",
                metadata: { bridgeUrl: this.options.bridgeUrl, pairedAt: paired.pairedAt },
              });
            }
            resolve(paired);
          } else if (message.type === "error") {
            clearTimeout(timeout);
            ws.off("message", onMessage);
            reject(new Error((message.payload as { message?: string }).message ?? "Sync bridge pairing failed"));
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.off("message", onMessage);
          reject(error);
        }
      };

      ws.on("message", onMessage);
      ws.send(JSON.stringify(createSyncEnvelope("pair_device", payload)));
    });
  }
}
