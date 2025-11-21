/**
 * Node.js Server for OpenAI Realtime Voice Agents
 *
 * This server handles WebRTC/WebSocket connections for realtime voice
 * and integrates with Convex backend for data operations.
 *
 * Architecture:
 * Browser (WebRTC) <-> Node.js Server (OpenAI Realtime) <-> Convex (Data/Tools)
 */

import express from 'express';
import cors from 'cors';
import { createRealtimeAgent } from './agents/voiceAgent';
import { createSessionRouter } from './routes/session';
import { createHealthRouter } from './routes/health';

const app = express();
const PORT = process.env.VOICE_SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', createHealthRouter());
app.use('/voice', createSessionRouter());

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎙️  Voice Server running on http://localhost:${PORT}`);
  console.log(`📡 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`🔗 Convex URL: ${process.env.CONVEX_URL || 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

