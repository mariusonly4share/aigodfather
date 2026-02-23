# AIGodfather SDK

Official SDKs for [AIGodfather](https://aigodfather.ai) —
AI Agent Monitoring & EU AI Act Compliance Platform.

Monitor your AI agents, track events, detect anomalies,
enforce rules, and stay EU AI Act compliant.

## Packages

| Package | Install | Version |
|---------|---------|---------|
| JavaScript/TypeScript | `npm install aigodfather` | 2.0.0 |
| Python | `pip install aigodfather` | 2.0.0 |
| PHP | `composer require aigodfather/aigodfather-php` | 2.0.0 |

## Quick Start

### JavaScript

```typescript
import { AIGodfather } from 'aigodfather'

const ai = new AIGodfather({ apiKey: 'agf_live_...' })

await ai.info('Server started')
await ai.error('Payment failed', { orderId: 'ord_123' })

// Track actions (rule engine evaluates these)
const result = await ai.action('payment', {
  resource: 'stripe',
  amount: 500,
  severity: 'high',
})

// Human-in-the-loop approvals
if (result.status === 'pending_approval') {
  const decision = await ai.waitForApproval(result.approvalId!)
  console.log(decision.status) // 'approved' | 'denied' | 'expired'
}
```

### Python

```python
from aigodfather import AIGodfather

ai = AIGodfather(api_key='agf_live_...')

ai.info('Server started')
ai.error('Payment failed', {'order_id': 'ord_123'})

# Track actions
result = ai.action('payment', resource='stripe', amount=500, severity='high')

# Human-in-the-loop
if result['status'] == 'pending_approval':
    decision = ai.wait_for_approval(result['approval_id'])
    print(decision['status'])  # 'approved' | 'denied' | 'expired'
```

### PHP

```php
use AIGodfather\AIGodfather;

$ai = new AIGodfather(['apiKey' => 'agf_live_...']);

$ai->info('Server started');
$ai->error('Payment failed', ['orderId' => 'ord_123']);

// Track actions
$result = $ai->action('payment', [
    'resource' => 'stripe',
    'amount' => 500,
    'severity' => 'high',
]);

// Human-in-the-loop
if ($result['status'] === 'pending_approval') {
    $decision = $ai->waitForApproval($result['approval_id']);
    echo $decision['status']; // 'approved' | 'denied' | 'expired'
}
```

## v2.0 Features

- **`action()`** — Track actions evaluated by the rule engine (payment, delete, export, etc.)
- **Block handling** — `BlockedError` thrown when a rule blocks an action
- **Approval flow** — `waitForApproval()` polls until a human decides
- **Retry logic** — Exponential backoff on 429/5xx errors
- **Callbacks** — `onBlock` and `onApprovalRequired` hooks
- **Rich responses** — Full `EventResponse` with `rulesMatched`, `incidentCreated`, `aiClassification`

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
