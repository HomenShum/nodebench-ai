# @homenshum/nodebench-mcp-client

Thin MCP client SDK for connecting to NodeBench's WebSocket gateway. Zero runtime dependencies -- uses native WebSocket and crypto.

## Install

```bash
npm install @homenshum/nodebench-mcp-client
```

## Quick start

```typescript
import { NodeBenchClient } from '@homenshum/nodebench-mcp-client'

const client = new NodeBenchClient({ apiKey: 'nb_key_...' })

// Connect to the gateway
await client.connect()

// List available tools
const tools = await client.listTools()
console.log(`${tools.length} tools available`)

// Call a tool
const result = await client.callTool('discover_tools', { query: 'research' })
console.log(result.content)

// Disconnect when done
client.disconnect()
```

## Configuration

```typescript
const client = new NodeBenchClient({
  apiKey: 'nb_key_...',                          // Required: API key
  url: 'wss://api.nodebenchai.com/mcp',          // Optional: gateway URL
  maxReconnectDelay: 30_000,                      // Optional: max backoff (ms)
})
```

## Error handling

```typescript
client.onError((err) => console.error('Client error:', err.message))
client.onDisconnect((code, reason) => {
  // Close codes: 4001=auth, 4002=rate limit, 4003=idle timeout
  console.log(`Disconnected: ${code} ${reason}`)
})
```

## API

| Method | Description |
|--------|-------------|
| `connect()` | Connect to the gateway (auto-reconnects on drop) |
| `disconnect()` | Close the connection |
| `listTools()` | List all available MCP tools |
| `callTool(name, args)` | Execute a tool and return the result |
| `onError(handler)` | Register error callback |
| `onDisconnect(handler)` | Register disconnect callback |
| `isConnected` | Whether the client is currently connected |
| `connectionState` | Current state: disconnected, connecting, connected, reconnecting |

## Auto-reconnect

The client automatically reconnects with exponential backoff (1s, 2s, 4s, ... up to 30s) on unexpected disconnections. It will not reconnect on:

- Authentication failures (4001)
- Capacity full (4005)
- Intentional `disconnect()` calls

## Requirements

- Node.js >= 18.0.0 (native WebSocket)
- API key from NodeBench (format: `nb_key_[32 hex chars]`)
