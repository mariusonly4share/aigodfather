# AIGodfather SDK

Official SDK for [AIGodfather](https://aigodfather.ai) —
AI Agent Monitoring & EU AI Act Compliance Platform.

Monitor your AI agents, track events, detect anomalies,
and stay EU AI Act compliant.

## Packages

| Package | Install | Version |
|---------|---------|---------|
| JavaScript/TypeScript | `npm install aigodfather` | 1.0.0 |
| Python | `pip install aigodfather` | 1.0.0 |

## Quick Start

### JavaScript

```bash
npm install aigodfather
```

```typescript
import { AIGodfather } from 'aigodfather'

const ai = new AIGodfather({
  apiKey: 'agf_live_...',
  debug: true
})

await ai.info('Server started')
await ai.error('Payment failed', { orderId: 'ord_123' })
await ai.critical('Database down')
```

### Python

```bash
pip install aigodfather
```

```python
from aigodfather import AIGodfather

ai = AIGodfather(api_key='agf_live_...')

ai.info('Server started')
ai.error('Payment failed', {'order_id': 'ord_123'})
ai.critical('Database down')
```

## Get Your API Key

1. Sign up at [https://aigodfather.ai](https://aigodfather.ai)
2. Create an agent
3. Go to Agent → Connection → API Keys
4. Generate key → copy it

## Documentation

Full docs: [https://aigodfather.ai/docs](https://aigodfather.ai/docs)

## Support

- Email: support@aigodfather.ai
- Issues: [github.com/aigodfather/aigodfather-sdk/issues](https://github.com/aigodfather/aigodfather-sdk/issues)
