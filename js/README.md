# AIGodfather JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for [AIGodfather](https://aigodfather.ai) —
AI Agent Monitoring & EU AI Act Compliance Platform.

## Installation

```bash
npm install aigodfather
# or
yarn add aigodfather
# or
pnpm add aigodfather
```

## Quick Start

```typescript
import { AIGodfather } from 'aigodfather'

const ai = new AIGodfather({
  apiKey: 'agf_live_...',
  debug: true
})

// Check connection
const status = await ai.ping()
console.log(`Connected: ${status.agentName}`)
console.log(`Events remaining: ${status.limits.remaining}`)

// Track events
await ai.info('Server started', { version: '1.0.0' })
await ai.warning('High memory', { percent: 87 })
await ai.error('Payment failed', { orderId: 'ord_123' })
await ai.critical('Database down')

// Custom event
await ai.track('user_signup', {
  severity: 'low',
  message: 'New user registered',
  metadata: { plan: 'trial', country: 'RO' },
  userId: 'user_456',
  tags: ['signup']
})
```

## Configuration

```typescript
const ai = new AIGodfather({
  apiKey: 'agf_live_...',        // required
  baseUrl: 'https://api.aigodfather.ai', // optional
  debug: false,                   // optional — log requests to console
  timeout: 10000,                 // optional — request timeout in ms
  defaultTags: ['production'],    // optional — tags added to every event
  defaultMetadata: { env: 'prod' } // optional — metadata merged into every event
})
```

## API

| Method | Description |
|--------|-------------|
| `ai.ping()` | Test connection, get agent info & limits |
| `ai.track(eventType, options?)` | Send a custom event |
| `ai.info(message, metadata?)` | Info-level event (severity: low) |
| `ai.warning(message, metadata?)` | Warning event (severity: medium) |
| `ai.error(message, metadata?)` | Error event (severity: high) |
| `ai.critical(message, metadata?)` | Critical event (severity: critical) |

## Framework Examples

- [Basic Node.js](./examples/basic.js)
- [Express middleware](./examples/express.js)
- [Next.js integration](./examples/nextjs.js)
- [n8n guide](./examples/n8n-guide.md)

## Get Your API Key

1. Sign up at [https://aigodfather.ai](https://aigodfather.ai)
2. Create an agent
3. Go to Agent → Connection → API Keys
4. Generate key → copy it

## License

MIT — see [LICENSE](../LICENSE)
