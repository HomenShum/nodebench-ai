/**
 * Voice session routes
 * 
 * Handles WebRTC session creation and management for OpenAI Realtime API
 */

import { Router } from 'express';
import { RealtimeSession } from '@openai/agents/realtime';
import { createRealtimeAgent } from '../agents/voiceAgent';
import { SessionManager } from '../services/sessionManager';

const sessionManager = new SessionManager();

export function createSessionRouter() {
  const router = Router();

  /**
   * POST /voice/session
   * Create a new realtime voice session
   * 
   * Request body:
   * {
   *   userId: string,
   *   model?: string,
   *   config?: RealtimeSessionConfig
   * }
   * 
   * Response:
   * {
   *   sessionId: string,
   *   ephemeralKey: string,  // Client API key for WebRTC
   *   config: object
   * }
   */
  router.post('/session', async (req, res) => {
    try {
      const { userId, model = 'gpt-4o-realtime-preview', config } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Create agent with Convex tools
      const agent = createRealtimeAgent(userId, model);

      // Create session
      const session = new RealtimeSession(agent, {
        model,
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          inputAudioTranscription: {
            model: 'whisper-1',
          },
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefixPaddingMs: 300,
            silenceDurationMs: 500,
          },
          ...config,
        },
      });

      // Generate ephemeral API key for client
      const ephemeralKey = await generateEphemeralKey(userId);

      // Store session
      const sessionId = sessionManager.addSession(userId, session);

      // Set up session event handlers
      setupSessionHandlers(session, sessionId, userId);

      res.json({
        sessionId,
        ephemeralKey,
        config: session.config,
      });
    } catch (error) {
      console.error('[POST /voice/session] Error:', error);
      res.status(500).json({
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /voice/session/:sessionId
   * Close a realtime voice session
   */
  router.delete('/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Disconnect session
      await session.disconnect();
      sessionManager.removeSession(sessionId);

      res.json({ status: 'disconnected' });
    } catch (error) {
      console.error('[DELETE /voice/session] Error:', error);
      res.status(500).json({
        error: 'Failed to close session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /voice/session/:sessionId/interrupt
   * Manually interrupt the agent
   */
  router.post('/session/:sessionId/interrupt', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.interrupt();
      res.json({ status: 'interrupted' });
    } catch (error) {
      console.error('[POST /voice/session/interrupt] Error:', error);
      res.status(500).json({ error: 'Failed to interrupt session' });
    }
  });

  return router;
}

/**
 * Set up event handlers for a realtime session
 */
function setupSessionHandlers(session: RealtimeSession, sessionId: string, userId: string) {
  session.on('audio_interrupted', () => {
    console.log(`[Session ${sessionId}] Audio interrupted`);
  });

  session.on('history_updated', (history) => {
    console.log(`[Session ${sessionId}] History updated: ${history.length} items`);
  });

  session.on('guardrail_tripped', (details) => {
    console.warn(`[Session ${sessionId}] Guardrail tripped:`, details);
  });

  session.on('error', (error) => {
    console.error(`[Session ${sessionId}] Error:`, error);
  });
}

/**
 * Generate ephemeral API key for client-side WebRTC connection
 * This should call OpenAI's API to create a temporary key
 */
async function generateEphemeralKey(userId: string): Promise<string> {
  // TODO: Implement OpenAI ephemeral key generation
  // For now, return the server's API key (NOT SECURE - for development only)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return apiKey;
}

