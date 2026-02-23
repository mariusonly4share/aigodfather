<?php

require_once __DIR__ . '/../src/AIGodfather.php';

use AIGodfather\AIGodfather;
use AIGodfather\BlockedError;
use AIGodfather\PlanLimitError;

$ai = new AIGodfather([
    'apiKey' => getenv('AIGODFATHER_API_KEY'),
    'debug' => true,
]);

// Check connection
$status = $ai->ping();
echo "Connected: {$status['agentName']}\n";
echo "Events remaining: {$status['limits']['remaining']}\n";

// Track events
$ai->info('App started', ['version' => '1.0.0']);
$ai->warning('High memory', ['percent' => 87]);
$ai->error('Payment failed', ['orderId' => 'ord_123']);
$ai->critical('Database down');

// Track an action with approval flow
try {
    $result = $ai->action('large_payment', [
        'resource' => 'stripe',
        'severity' => 'high',
        'amount' => 5000,
        'currency' => 'USD',
        'requiresApproval' => true,
    ]);

    if ($result['status'] === 'pending_approval') {
        echo "Waiting for human approval...\n";
        $decision = $ai->waitForApproval($result['approval_id']);
        echo "Decision: {$decision['status']}\n";

        if ($decision['status'] === 'approved') {
            echo "Payment approved — proceeding.\n";
        } else {
            echo "Payment denied — aborting.\n";
        }
    }
} catch (BlockedError $e) {
    echo "Action was blocked: {$e->getMessage()}\n";
} catch (PlanLimitError $e) {
    echo "Plan limit reached. Upgrade to: {$e->upgradeRequired}\n";
}
