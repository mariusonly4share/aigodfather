# AIGodfather JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for [AIGodfather](https://aigodfather.com) —
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

// Track an action (evaluated by rule engine)
const result = await ai.action('payment', {
  resource: 'stripe',
  severity: 'high',
  amount: 500,
  currency: 'USD',
  metadata: { customer: 'cust_456' },
})

// Human-in-the-loop approval flow
if (result.status === 'pending_approval') {
  const decision = await ai.waitForApproval(result.approvalId!)
  if (decision.status === 'approved') {
    // proceed with action
  } else {
    // abort
  }
}
```

## Configuration

```typescript
const ai = new AIGodfather({
  apiKey: 'agf_live_...',                  // required
  baseUrl: 'https://aigodfather.com/api',   // optional
  debug: false,                             // optional — log requests to console
  timeout: 10000,                           // optional — request timeout in ms
  maxRetries: 3,                            // optional — retries on 429/5xx
  defaultTags: ['production'],              // optional — tags added to every event
  defaultMetadata: { env: 'prod' },         // optional — metadata merged into every event
  onBlock: (err) => {                       // optional — called when rule blocks
    console.error('BLOCKED:', err.message)
  },
  onApprovalRequired: (approval) => {       // optional — called when approval needed
    console.log('Approval needed:', approval.approvalId)
  },
})
```

## API

| Method | Description |
|--------|-------------|
| `ai.ping()` | Test connection, get agent info & limits |
| `ai.track(eventType, options?)` | Send a custom event |
| `ai.action(actionName, options?)` | Track an action (rule engine evaluates) |
| `ai.info(message, metadata?)` | Info-level event (severity: low) |
| `ai.warning(message, metadata?)` | Warning event (severity: medium) |
| `ai.error(message, metadata?)` | Error event (severity: high) |
| `ai.critical(message, metadata?)` | Critical event (severity: critical) |
| `ai.waitForApproval(id, interval?, timeout?)` | Poll until approval resolves |
| `ai.checkApproval(id)` | Single poll of approval status |

## Error Handling

```typescript
import { BlockedError, PlanLimitError, AgentPausedError } from 'aigodfather'

try {
  await ai.action('delete_database', { severity: 'critical' })
} catch (err) {
  if (err instanceof BlockedError) {
    console.log('Action was blocked by a rule')
  } else if (err instanceof PlanLimitError) {
    console.log(`Upgrade to: ${err.upgradeRequired}`)
  } else if (err instanceof AgentPausedError) {
    console.log('Agent is paused')
  }
}
```

## Framework Examples

- [Basic Node.js](./examples/basic.js)
- [Express middleware](./examples/express.js)
- [Next.js integration](./examples/nextjs.js)
- [n8n guide](./examples/n8n-guide.md)

## Get Your API Key

1. Sign up at [https://aigodfather.com](https://aigodfather.com)
2. Create an agent
3. Go to Agent → Connection → API Keys
4. Generate key → copy it

## License

MIT — see [LICENSE](../LICENSE)
