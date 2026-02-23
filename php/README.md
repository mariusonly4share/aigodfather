# AIGodfather PHP SDK

Official PHP SDK for [AIGodfather](https://aigodfather.ai) —
AI Agent Monitoring & EU AI Act Compliance Platform.

## Installation

```bash
composer require aigodfather/aigodfather-php
```

## Quick Start

```php
<?php
require_once 'vendor/autoload.php';

use AIGodfather\AIGodfather;

$ai = new AIGodfather([
    'apiKey' => 'agf_live_...',
    'debug' => true,
]);

// Check connection
$status = $ai->ping();
echo "Connected: {$status['agentName']}\n";
echo "Events remaining: {$status['limits']['remaining']}\n";

// Track events
$ai->info('Server started', ['version' => '1.0.0']);
$ai->warning('High memory', ['percent' => 87]);
$ai->error('Payment failed', ['orderId' => 'ord_123']);
$ai->critical('Database down');

// Track an action (evaluated by rule engine)
$result = $ai->action('payment', [
    'resource' => 'stripe',
    'severity' => 'high',
    'amount' => 500,
    'currency' => 'USD',
    'metadata' => ['customer' => 'cust_456'],
]);

if ($result['status'] === 'pending_approval') {
    $decision = $ai->waitForApproval($result['approval_id']);
    echo "Decision: {$decision['status']}\n";
}
```

## Configuration

```php
$ai = new AIGodfather([
    'apiKey' => 'agf_live_...',              // required
    'baseUrl' => 'https://api.aigodfather.ai', // optional
    'debug' => false,                          // optional
    'timeout' => 10,                           // optional — seconds
    'maxRetries' => 3,                         // optional
    'defaultTags' => ['production'],           // optional
    'defaultMetadata' => ['env' => 'prod'],    // optional
    'onBlock' => function($err) {              // optional
        echo "BLOCKED: {$err->getMessage()}\n";
    },
    'onApprovalRequired' => function($info) {  // optional
        echo "Approval needed: {$info['approval_id']}\n";
    },
]);
```

## API

| Method | Description |
|--------|-------------|
| `$ai->ping()` | Test connection, get agent info & limits |
| `$ai->track(eventType, options?)` | Send a custom event |
| `$ai->action(actionName, options?)` | Track an action (rule engine evaluates) |
| `$ai->info(message, metadata?)` | Info-level event (severity: low) |
| `$ai->warning(message, metadata?)` | Warning event (severity: medium) |
| `$ai->error(message, metadata?)` | Error event (severity: high) |
| `$ai->critical(message, metadata?)` | Critical event (severity: critical) |
| `$ai->waitForApproval(id, interval?, timeout?)` | Poll until approval resolves |
| `$ai->checkApproval(id)` | Single poll of approval status |

## Error Handling

```php
use AIGodfather\BlockedError;
use AIGodfather\PlanLimitError;
use AIGodfather\AgentPausedError;

try {
    $ai->action('delete_database', ['severity' => 'critical']);
} catch (BlockedError $e) {
    echo "Action was blocked by a rule\n";
} catch (PlanLimitError $e) {
    echo "Upgrade to: {$e->upgradeRequired}\n";
} catch (AgentPausedError $e) {
    echo "Agent is paused\n";
}
```

## Requirements

- PHP >= 7.4
- ext-curl
- ext-json

## License

MIT — see [LICENSE](../LICENSE)
