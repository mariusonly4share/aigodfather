/**
 * AIGodfather SDK for JavaScript/TypeScript
 * Official SDK for AI Agent Monitoring & EU AI Act Compliance
 *
 * @see https://aigodfather.com/docs
 */

const SDK_VERSION = '2.1.0'

// ── Types ──────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface AIGodfatherConfig {
  /** Your API key (starts with agf_live_) */
  apiKey: string
  /** Base URL override (default: https://aigodfather.com/api) */
  baseUrl?: string
  /** Enable debug logging to console (default: false) */
  debug?: boolean
  /** Request timeout in ms (default: 10000) */
  timeout?: number
  /** Max retries on 429/500+ errors (default: 3) */
  maxRetries?: number
  /** Default tags applied to every event */
  defaultTags?: string[]
  /** Default metadata merged into every event */
  defaultMetadata?: Record<string, unknown>
  /** Called when a rule blocks an action */
  onBlock?: (error: BlockedError) => void
  /** Called when an action requires human approval */
  onApprovalRequired?: (approval: ApprovalInfo) => void
}

export interface TrackOptions {
  /** Event severity */
  severity?: Severity
  /** Human-readable message */
  message?: string
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>
  /** Associated user ID */
  userId?: string
  /** Tags for filtering */
  tags?: string[]
}

export interface ActionOptions {
  /** Target resource (e.g. "database", "user:123", "file.csv") */
  resource?: string
  /** Action severity */
  severity?: Severity
  /** Human-readable message */
  message?: string
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>
  /** Associated user ID */
  userId?: string
  /** Tags for filtering */
  tags?: string[]
  /** Flag this action as requiring human approval */
  requiresApproval?: boolean
  /** Callback URL for approval webhook notification */
  callbackUrl?: string
  /** Monetary amount (for payment rules) */
  amount?: number
  /** Currency code (for payment rules) */
  currency?: string
}

export interface PingResponse {
  status: string
  agentId: string
  agentName: string
  isPaused: boolean
  aiEnabled: boolean
  maintenanceMode: boolean
  serverTime: string
  limits: {
    eventsThisMonth: number
    eventsLimit: number
    remaining: number
  }
}

export interface SigmaAnchorInfo {
  anchored: boolean
  anchorId: string | null
  nodesConfirmed: number
  anchoredAt: string | null
}

export interface EventResponse {
  success: boolean
  status: 'recorded' | 'blocked' | 'pending_approval'
  eventId: string | null
  agentId: string | null
  rulesMatched: number
  incidentCreated: boolean
  incidentId: string | null
  aiClassification: { ai_risk_score: number; ai_classification: string } | null
  warning: string | null
  timestamp: string
  /** Present when status is 'pending_approval' */
  approvalId?: string
  /** Present when status is 'pending_approval' */
  pollUrl?: string
  /** AIGP-Σ anchor info (present when Sigma is enabled) */
  sigma?: SigmaAnchorInfo
}

export interface ApprovalInfo {
  approvalId: string
  pollUrl: string
  blocking: boolean
  rulesMatched: number
}

export interface ApprovalStatus {
  status: 'pending' | 'approved' | 'denied' | 'expired'
  reason: string | null
  decidedAt: string | null
}

// ── Error Classes ──────────────────────────────────────

export class BlockedError extends Error {
  readonly status = 403
  readonly blocked = true
  constructor(message: string) {
    super(message)
    this.name = 'BlockedError'
  }
}

export class ApprovalRequiredError extends Error {
  readonly status = 202
  readonly approvalId: string
  readonly pollUrl: string
  constructor(approval: ApprovalInfo) {
    super(`Action requires human approval (${approval.approvalId})`)
    this.name = 'ApprovalRequiredError'
    this.approvalId = approval.approvalId
    this.pollUrl = approval.pollUrl
  }
}

export class PlanLimitError extends Error {
  readonly status = 429
  readonly upgradeRequired: string
  constructor(message: string, upgradeRequired: string) {
    super(message)
    this.name = 'PlanLimitError'
    this.upgradeRequired = upgradeRequired
  }
}

export class AgentPausedError extends Error {
  readonly status = 503
  constructor() {
    super('Agent is paused. Resume from the AIGodfather dashboard.')
    this.name = 'AgentPausedError'
  }
}

// ── SDK Class ──────────────────────────────────────────

export class AIGodfather {
  private apiKey: string
  private baseUrl: string
  private debug: boolean
  private timeout: number
  private maxRetries: number
  private defaultTags: string[]
  private defaultMetadata: Record<string, unknown>
  private onBlock?: (error: BlockedError) => void
  private onApprovalRequired?: (approval: ApprovalInfo) => void
  private currentTraceId: string | null = null

  constructor(config: AIGodfatherConfig) {
    if (!config.apiKey) {
      throw new Error('[AIGodfather] apiKey is required')
    }

    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl || 'https://aigodfather.com/api').replace(/\/+$/, '')
    this.debug = config.debug ?? false
    this.timeout = config.timeout ?? 10_000
    this.maxRetries = config.maxRetries ?? 3
    this.defaultTags = config.defaultTags ?? []
    this.defaultMetadata = config.defaultMetadata ?? {}
    this.onBlock = config.onBlock
    this.onApprovalRequired = config.onApprovalRequired
  }

  // ── Public Methods ─────────────────────────────────

  /**
   * Test connectivity and retrieve agent info + usage limits.
   * Also updates the agent's connection status on the platform.
   */
  async ping(): Promise<PingResponse> {
    return this.request<PingResponse>('POST', '/v1/ping', {
      sdk_version: SDK_VERSION,
      integration_type: 'js-sdk',
    })
  }

  /**
   * Track a custom event (maps to event_type on the platform).
   */
  async track(eventType: string, options: TrackOptions = {}): Promise<EventResponse> {
    const body: Record<string, unknown> = {
      event_type: eventType,
      severity: options.severity ?? 'low',
      message: options.message ?? '',
      metadata: { ...this.defaultMetadata, ...(options.metadata ?? {}) },
      user_id: options.userId,
      tags: [...this.defaultTags, ...(options.tags ?? [])],
      source: 'js-sdk',
    }
    return this.sendEvent(body)
  }

  /**
   * Track an explicit action (maps to `action` on the platform).
   * Use this for actions the rule engine should evaluate.
   */
  async action(actionName: string, options: ActionOptions = {}): Promise<EventResponse> {
    const body: Record<string, unknown> = {
      action: actionName,
      resource: options.resource,
      risk_level: options.severity ?? 'low',
      payload: { ...this.defaultMetadata, ...(options.metadata ?? {}) },
      actor: undefined,
      user_id: options.userId,
      tags: [...this.defaultTags, ...(options.tags ?? [])],
      requires_approval: options.requiresApproval ?? false,
      callback_url: options.callbackUrl,
      source: 'js-sdk',
    }
    if (options.message) (body.payload as Record<string, unknown>)._message = options.message
    if (options.amount != null) (body.payload as Record<string, unknown>).amount = options.amount
    if (options.currency) (body.payload as Record<string, unknown>).currency = options.currency
    return this.sendEvent(body)
  }

  /** Track an info-level event. */
  async info(message: string, metadata?: Record<string, unknown>): Promise<EventResponse> {
    return this.track('info', { severity: 'low', message, metadata })
  }

  /** Track a warning-level event. */
  async warning(message: string, metadata?: Record<string, unknown>): Promise<EventResponse> {
    return this.track('warning', { severity: 'medium', message, metadata })
  }

  /** Track an error-level event. */
  async error(message: string, metadata?: Record<string, unknown>): Promise<EventResponse> {
    return this.track('error', { severity: 'high', message, metadata })
  }

  /** Track a critical-level event. */
  async critical(message: string, metadata?: Record<string, unknown>): Promise<EventResponse> {
    return this.track('critical', { severity: 'critical', message, metadata })
  }

  /**
   * Poll an approval request until it resolves.
   * Returns the final status (approved/denied/expired).
   *
   * @param approvalId - The approval ID from an EventResponse
   * @param intervalMs - Polling interval in ms (default: 2000)
   * @param timeoutMs  - Max wait time in ms (default: 300000 = 5 min)
   */
  async waitForApproval(
    approvalId: string,
    intervalMs = 2000,
    timeoutMs = 300_000
  ): Promise<ApprovalStatus> {
    const deadline = Date.now() + timeoutMs
    this.log(`Waiting for approval ${approvalId} (timeout: ${timeoutMs}ms)`)

    while (Date.now() < deadline) {
      const result = await this.checkApproval(approvalId)
      if (result.status !== 'pending') {
        this.log(`Approval ${approvalId} resolved: ${result.status}`)
        return result
      }
      await this.sleep(intervalMs)
    }

    return { status: 'expired', reason: 'SDK polling timeout', decidedAt: null }
  }

  /**
   * Check the current status of an approval request (single poll).
   */
  async checkApproval(approvalId: string): Promise<ApprovalStatus> {
    const data = await this.request<{
      status: string
      reason: string | null
      decided_at: string | null
    }>('GET', `/v1/approvals/${approvalId}`)

    return {
      status: data.status as ApprovalStatus['status'],
      reason: data.reason,
      decidedAt: data.decided_at,
    }
  }

  // ── Tracing Methods ──────────────────────────────

  /**
   * Start a new trace. Stores the trace ID internally so subsequent
   * startSpan() calls auto-link to this trace.
   */
  async startTrace(options: {
    name: string
    input?: unknown
    tags?: string[]
    session_id?: string
    metadata?: Record<string, unknown>
  }): Promise<string> {
    const data = await this.request<{ trace_id: string }>('POST', '/v1/traces', {
      name: options.name,
      input: options.input,
      tags: options.tags,
      session_id: options.session_id,
      metadata: options.metadata,
    })
    this.currentTraceId = data.trace_id
    return data.trace_id
  }

  /**
   * End an existing trace. Clears the internal trace ID if it matches.
   */
  async endTrace(traceId: string, options: {
    output?: unknown
    status?: 'success' | 'error'
  } = {}): Promise<void> {
    await this.request<{ ok: boolean }>('PATCH', `/v1/traces/${traceId}`, {
      output: options.output,
      status: options.status ?? 'success',
    })
    if (this.currentTraceId === traceId) {
      this.currentTraceId = null
    }
  }

  /**
   * Start a new span within a trace. If trace_id is not provided,
   * uses the internally stored currentTraceId from startTrace().
   */
  async startSpan(options: {
    name: string
    type?: 'llm' | 'tool' | 'retrieval' | 'agent' | 'chain' | 'span'
    trace_id?: string
    parent_span_id?: string
    input?: unknown
    model?: string
    provider?: string
    metadata?: Record<string, unknown>
  }): Promise<string> {
    const traceId = options.trace_id ?? this.currentTraceId
    if (!traceId) {
      throw new Error('[AIGodfather] No trace_id provided and no active trace. Call startTrace() first.')
    }
    const data = await this.request<{ span_id: string }>('POST', '/v1/spans', {
      name: options.name,
      type: options.type ?? 'span',
      trace_id: traceId,
      parent_span_id: options.parent_span_id,
      input: options.input,
      model: options.model,
      provider: options.provider,
      metadata: options.metadata,
    })
    return data.span_id
  }

  /**
   * End an existing span with output data and token usage.
   */
  async endSpan(spanId: string, options: {
    output?: unknown
    status?: 'success' | 'error'
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    cost_usd?: number
    error_message?: string
  } = {}): Promise<void> {
    await this.request<{ ok: boolean }>('PATCH', `/v1/spans/${spanId}`, {
      output: options.output,
      status: options.status ?? 'success',
      prompt_tokens: options.prompt_tokens,
      completion_tokens: options.completion_tokens,
      total_tokens: options.total_tokens,
      cost_usd: options.cost_usd,
      error_message: options.error_message,
    })
  }

  // ── Private Helpers ────────────────────────────────

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AIGodfather]', ...args)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Send event to /v1/events with full response handling:
   * - 201: success → EventResponse
   * - 202: pending_approval → fires onApprovalRequired callback
   * - 403 blocked: fires onBlock callback, throws BlockedError
   * - 429: plan limit → throws PlanLimitError
   * - 503: agent paused → throws AgentPausedError
   */
  private async sendEvent(body: Record<string, unknown>): Promise<EventResponse> {
    const url = `${this.baseUrl}/v1/events`
    this.log(`POST ${url}`)

    const rawBody = JSON.stringify(body)
    this.log('Body:', rawBody)

    const response = await this.fetchWithRetry('POST', url, rawBody)
    const data = await response.json()

    // 403 — Blocked by rule
    if (response.status === 403) {
      const err = new BlockedError(data.message || 'Action blocked by rule')
      this.onBlock?.(err)
      throw err
    }

    // 429 — Plan limit
    if (response.status === 429) {
      throw new PlanLimitError(
        data.error || 'Plan event limit reached',
        data.upgradeRequired || 'growth'
      )
    }

    // 503 — Agent paused
    if (response.status === 503) {
      throw new AgentPausedError()
    }

    // Other errors
    if (response.status >= 400) {
      const error = new Error(`[AIGodfather] HTTP ${response.status}: ${JSON.stringify(data)}`)
      ;(error as any).status = response.status
      throw error
    }

    // 202 — Pending approval
    if (response.status === 202) {
      const approval: ApprovalInfo = {
        approvalId: data.approval_id,
        pollUrl: data.poll_url,
        blocking: data.blocking ?? true,
        rulesMatched: data.rules_matched ?? 0,
      }
      this.onApprovalRequired?.(approval)

      return {
        success: true,
        status: 'pending_approval',
        eventId: null,
        agentId: null,
        rulesMatched: approval.rulesMatched,
        incidentCreated: false,
        incidentId: null,
        aiClassification: null,
        warning: null,
        timestamp: new Date().toISOString(),
        approvalId: approval.approvalId,
        pollUrl: approval.pollUrl,
      }
    }

    // 201 — Success
    const result: EventResponse = {
      success: data.success ?? true,
      status: 'recorded',
      eventId: data.event_id ?? null,
      agentId: data.agent_id ?? null,
      rulesMatched: data.rules_matched ?? 0,
      incidentCreated: data.incident_created ?? false,
      incidentId: data.incident_id ?? null,
      aiClassification: data.ai_classification ?? null,
      warning: data.warning ?? null,
      timestamp: data.timestamp ?? new Date().toISOString(),
      sigma: data.sigma_anchored != null ? {
        anchored: data.sigma_anchored ?? false,
        anchorId: data.sigma_anchor_id ?? null,
        nodesConfirmed: data.sigma_nodes_count ?? 0,
        anchoredAt: data.sigma_anchored_at ?? null,
      } : undefined,
    }
    this.log('Response:', JSON.stringify(result, null, 2))
    return result
  }

  /**
   * Fetch with exponential backoff retry on 429 and 5xx errors.
   */
  private async fetchWithRetry(
    method: string,
    url: string,
    body?: string
  ): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10_000)
        this.log(`Retry ${attempt}/${this.maxRetries} after ${delay}ms`)
        await this.sleep(delay)
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `aigodfather-js/${SDK_VERSION}`,
        }

        const opts: RequestInit = { method, headers, signal: controller.signal }
        if (body && method !== 'GET') opts.body = body

        const response = await fetch(url, opts)

        // Don't retry on 4xx (except 429) — those are intentional
        if (response.status === 429 || response.status >= 500) {
          if (attempt < this.maxRetries) {
            this.log(`HTTP ${response.status} — will retry`)
            continue
          }
        }

        return response
      } catch (err: any) {
        if (err.name === 'AbortError') {
          lastError = new Error(`[AIGodfather] Request timed out after ${this.timeout}ms`)
        } else {
          lastError = err
        }
        if (attempt === this.maxRetries) break
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError ?? new Error('[AIGodfather] Request failed after retries')
  }

  /**
   * Generic request helper for non-event endpoints (ping, approvals, etc.)
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    this.log(`${method} ${url}`)

    const rawBody = body ? JSON.stringify(body) : undefined
    if (rawBody) this.log('Body:', rawBody)

    const response = await this.fetchWithRetry(method, url, rawBody)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      const error = new Error(`[AIGodfather] HTTP ${response.status}: ${errorBody}`)
      ;(error as any).status = response.status
      throw error
    }

    const data = (await response.json()) as T
    this.log('Response:', JSON.stringify(data, null, 2))
    return data
  }
}

// ── Default Export ──────────────────────────────────────

export default AIGodfather
