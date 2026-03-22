<?php

/**
 * AIGodfather SDK for PHP
 * Official SDK for AI Agent Monitoring & EU AI Act Compliance
 *
 * @see https://aigodfather.com/docs
 */

namespace AIGodfather;

class BlockedError extends \RuntimeException
{
    public int $statusCode = 403;
    public bool $blocked = true;
}

class ApprovalRequiredError extends \RuntimeException
{
    public int $statusCode = 202;
    public string $approvalId;
    public string $pollUrl;

    public function __construct(string $approvalId, string $pollUrl)
    {
        parent::__construct("Action requires human approval ({$approvalId})");
        $this->approvalId = $approvalId;
        $this->pollUrl = $pollUrl;
    }
}

class PlanLimitError extends \RuntimeException
{
    public int $statusCode = 429;
    public string $upgradeRequired;

    public function __construct(string $message, string $upgradeRequired = 'growth')
    {
        parent::__construct($message);
        $this->upgradeRequired = $upgradeRequired;
    }
}

class AgentPausedError extends \RuntimeException
{
    public int $statusCode = 503;

    public function __construct()
    {
        parent::__construct('Agent is paused. Resume from the AIGodfather dashboard.');
    }
}

class AIGodfather
{
    const SDK_VERSION = '2.1.0';

    private string $apiKey;
    private string $baseUrl;
    private bool $debug;
    private int $timeout;
    private int $maxRetries;
    private array $defaultTags;
    private array $defaultMetadata;
    /** @var callable|null */
    private $onBlock;
    /** @var callable|null */
    private $onApprovalRequired;

    /**
     * @param array $config {
     *   @type string   $apiKey           Required. Your API key.
     *   @type string   $baseUrl          Optional. Default: https://aigodfather.com/api
     *   @type bool     $debug            Optional. Default: false
     *   @type int      $timeout          Optional. Timeout in seconds. Default: 10
     *   @type int      $maxRetries       Optional. Default: 3
     *   @type string[] $defaultTags      Optional. Tags added to every event.
     *   @type array    $defaultMetadata  Optional. Metadata merged into every event.
     *   @type callable $onBlock          Optional. Called when a rule blocks an action.
     *   @type callable $onApprovalRequired Optional. Called when approval is needed.
     * }
     */
    public function __construct(array $config)
    {
        if (empty($config['apiKey'])) {
            throw new \InvalidArgumentException('[AIGodfather] apiKey is required');
        }

        $this->apiKey = $config['apiKey'];
        $this->baseUrl = rtrim($config['baseUrl'] ?? 'https://aigodfather.com/api', '/');
        $this->debug = $config['debug'] ?? false;
        $this->timeout = $config['timeout'] ?? 10;
        $this->maxRetries = $config['maxRetries'] ?? 3;
        $this->defaultTags = $config['defaultTags'] ?? [];
        $this->defaultMetadata = $config['defaultMetadata'] ?? [];
        $this->onBlock = $config['onBlock'] ?? null;
        $this->onApprovalRequired = $config['onApprovalRequired'] ?? null;
    }

    // ── Public Methods ────────────────────────────────

    /**
     * Test connectivity and retrieve agent info + usage limits.
     */
    public function ping(): array
    {
        return $this->request('POST', '/v1/ping', [
            'sdk_version' => self::SDK_VERSION,
            'integration_type' => 'php-sdk',
        ]);
    }

    /**
     * Track a custom event (maps to event_type on the platform).
     */
    public function track(string $eventType, array $options = []): array
    {
        $body = [
            'event_type' => $eventType,
            'severity' => $options['severity'] ?? 'low',
            'message' => $options['message'] ?? '',
            'metadata' => array_merge($this->defaultMetadata, $options['metadata'] ?? []),
            'user_id' => $options['userId'] ?? null,
            'tags' => array_merge($this->defaultTags, $options['tags'] ?? []),
            'source' => 'php-sdk',
        ];
        return $this->sendEvent($body);
    }

    /**
     * Track an explicit action (maps to `action` on the platform).
     * Use this for actions the rule engine should evaluate.
     */
    public function action(string $actionName, array $options = []): array
    {
        $payload = array_merge($this->defaultMetadata, $options['metadata'] ?? []);
        if (!empty($options['message'])) {
            $payload['_message'] = $options['message'];
        }
        if (isset($options['amount'])) {
            $payload['amount'] = $options['amount'];
        }
        if (!empty($options['currency'])) {
            $payload['currency'] = $options['currency'];
        }

        $body = [
            'action' => $actionName,
            'resource' => $options['resource'] ?? null,
            'risk_level' => $options['severity'] ?? 'low',
            'payload' => $payload,
            'user_id' => $options['userId'] ?? null,
            'tags' => array_merge($this->defaultTags, $options['tags'] ?? []),
            'requires_approval' => $options['requiresApproval'] ?? false,
            'callback_url' => $options['callbackUrl'] ?? null,
            'source' => 'php-sdk',
        ];
        return $this->sendEvent($body);
    }

    /** Track an info-level event. */
    public function info(string $message, array $metadata = []): array
    {
        return $this->track('info', ['severity' => 'low', 'message' => $message, 'metadata' => $metadata]);
    }

    /** Track a warning-level event. */
    public function warning(string $message, array $metadata = []): array
    {
        return $this->track('warning', ['severity' => 'medium', 'message' => $message, 'metadata' => $metadata]);
    }

    /** Track an error-level event. */
    public function error(string $message, array $metadata = []): array
    {
        return $this->track('error', ['severity' => 'high', 'message' => $message, 'metadata' => $metadata]);
    }

    /** Track a critical-level event. */
    public function critical(string $message, array $metadata = []): array
    {
        return $this->track('critical', ['severity' => 'critical', 'message' => $message, 'metadata' => $metadata]);
    }

    /**
     * Poll an approval request until it resolves.
     *
     * @param string $approvalId      The approval ID from an event response.
     * @param float  $intervalSeconds  Polling interval in seconds (default: 2).
     * @param float  $timeoutSeconds   Max wait time in seconds (default: 300).
     * @return array{status: string, reason: ?string, decided_at: ?string}
     */
    public function waitForApproval(
        string $approvalId,
        float $intervalSeconds = 2.0,
        float $timeoutSeconds = 300.0
    ): array {
        $deadline = microtime(true) + $timeoutSeconds;
        $this->log("Waiting for approval {$approvalId} (timeout: {$timeoutSeconds}s)");

        while (microtime(true) < $deadline) {
            $result = $this->checkApproval($approvalId);
            if ($result['status'] !== 'pending') {
                $this->log("Approval {$approvalId} resolved: {$result['status']}");
                return $result;
            }
            usleep((int)($intervalSeconds * 1_000_000));
        }

        return ['status' => 'expired', 'reason' => 'SDK polling timeout', 'decided_at' => null];
    }

    /**
     * Check the current status of an approval request (single poll).
     */
    public function checkApproval(string $approvalId): array
    {
        return $this->request('GET', "/v1/approvals/{$approvalId}");
    }

    // ── Private Helpers ───────────────────────────────

    private function log(string $message): void
    {
        if ($this->debug) {
            error_log("[AIGodfather] {$message}");
        }
    }

    /**
     * Send event to /v1/events with full response handling.
     */
    private function sendEvent(array $body): array
    {
        $url = "{$this->baseUrl}/v1/events";
        $this->log("POST {$url}");

        $response = $this->fetchWithRetry('POST', $url, $body);
        $data = $response['data'];
        $statusCode = $response['status'];

        // 403 — Blocked by rule
        if ($statusCode === 403) {
            $err = new BlockedError($data['message'] ?? 'Action blocked by rule');
            if ($this->onBlock) {
                ($this->onBlock)($err);
            }
            throw $err;
        }

        // 429 — Plan limit
        if ($statusCode === 429) {
            throw new PlanLimitError(
                $data['error'] ?? 'Plan event limit reached',
                $data['upgradeRequired'] ?? 'growth'
            );
        }

        // 503 — Agent paused
        if ($statusCode === 503) {
            throw new AgentPausedError();
        }

        // Other errors
        if ($statusCode >= 400) {
            throw new \RuntimeException("[AIGodfather] HTTP {$statusCode}: " . json_encode($data));
        }

        // 202 — Pending approval
        if ($statusCode === 202) {
            $approvalInfo = [
                'approval_id' => $data['approval_id'] ?? null,
                'poll_url' => $data['poll_url'] ?? null,
                'blocking' => $data['blocking'] ?? true,
                'rules_matched' => $data['rules_matched'] ?? 0,
            ];
            if ($this->onApprovalRequired) {
                ($this->onApprovalRequired)($approvalInfo);
            }

            return [
                'success' => true,
                'status' => 'pending_approval',
                'event_id' => null,
                'agent_id' => null,
                'rules_matched' => $approvalInfo['rules_matched'],
                'incident_created' => false,
                'incident_id' => null,
                'ai_classification' => null,
                'warning' => null,
                'approval_id' => $approvalInfo['approval_id'],
                'poll_url' => $approvalInfo['poll_url'],
            ];
        }

        // 201 — Success
        $result = [
            'success' => $data['success'] ?? true,
            'status' => 'recorded',
            'event_id' => $data['event_id'] ?? null,
            'agent_id' => $data['agent_id'] ?? null,
            'rules_matched' => $data['rules_matched'] ?? 0,
            'incident_created' => $data['incident_created'] ?? false,
            'incident_id' => $data['incident_id'] ?? null,
            'ai_classification' => $data['ai_classification'] ?? null,
            'warning' => $data['warning'] ?? null,
            'timestamp' => $data['timestamp'] ?? null,
        ];
        if (isset($data['sigma_anchored'])) {
            $result['sigma'] = [
                'anchored' => $data['sigma_anchored'] ?? false,
                'anchor_id' => $data['sigma_anchor_id'] ?? null,
                'nodes_confirmed' => $data['sigma_nodes_count'] ?? 0,
                'anchored_at' => $data['sigma_anchored_at'] ?? null,
            ];
        }
        return $result;
    }

    /**
     * Fetch with exponential backoff retry on 429 and 5xx errors.
     *
     * @return array{status: int, data: array}
     */
    private function fetchWithRetry(string $method, string $url, ?array $body = null): array
    {
        $lastError = null;

        for ($attempt = 0; $attempt <= $this->maxRetries; $attempt++) {
            if ($attempt > 0) {
                $delay = min(pow(2, $attempt - 1), 10);
                $this->log("Retry {$attempt}/{$this->maxRetries} after {$delay}s");
                usleep((int)($delay * 1_000_000));
            }

            try {
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => $this->timeout,
                    CURLOPT_HTTPHEADER => [
                        "Authorization: Bearer {$this->apiKey}",
                        'Content-Type: application/json',
                        'User-Agent: aigodfather-php/' . self::SDK_VERSION,
                    ],
                ]);

                if ($method === 'POST' && $body !== null) {
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }

                $responseBody = curl_exec($ch);
                $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($responseBody === false || $curlError) {
                    throw new \RuntimeException("[AIGodfather] cURL error: {$curlError}");
                }

                // Don't retry on 4xx (except 429) — those are intentional
                if ($statusCode === 429 || $statusCode >= 500) {
                    if ($attempt < $this->maxRetries) {
                        $this->log("HTTP {$statusCode} — will retry");
                        continue;
                    }
                }

                $data = json_decode($responseBody, true) ?? [];
                return ['status' => $statusCode, 'data' => $data];

            } catch (\RuntimeException $e) {
                $lastError = $e;
                if ($attempt === $this->maxRetries) {
                    break;
                }
            }
        }

        throw $lastError ?? new \RuntimeException('[AIGodfather] Request failed after retries');
    }

    /**
     * Generic request helper for non-event endpoints.
     */
    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = "{$this->baseUrl}{$path}";
        $this->log("{$method} {$url}");

        $response = $this->fetchWithRetry($method, $url, $body);

        if ($response['status'] >= 400) {
            throw new \RuntimeException(
                "[AIGodfather] HTTP {$response['status']}: " . json_encode($response['data'])
            );
        }

        return $response['data'];
    }
}
