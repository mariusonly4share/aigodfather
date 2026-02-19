/**
 * AIGodfather SDK for JavaScript/TypeScript
 * Official SDK for AI Agent Monitoring & EU AI Act Compliance
 *
 * @see https://aigodfather.ai/docs
 */

// ── Types ──────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface AIGodfatherConfig {
  /** Your API key (starts with agf_live_ or agf_test_) */
  apiKey: string
  /** Base URL override (default: https://api.aigodfather.ai) */
  baseUrl?: string
  /** Enable debug logging to console (default: false) */
  debug?: boolean
  /** Request timeout in ms (default: 10000) */
  timeout?: number
  /** Default tags applied to every event */
  defaultTags?: string[]
  /** Default metadata merged into every event */
  defaultMetadata?: Record<string, unknown>
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

export interface PingResponse {
  ok: boolean
  agentId: string
  agentName: string
  limits: {
    plan: string
    dailyLimit: number
    used: number
    remaining: number
  }
}

export interface TrackResponse {
  ok: boolean
  eventId: string
}

// ── SDK Class ──────────────────────────────────────────

export class AIGodfather {
  private apiKey: string
  private baseUrl: string
  private debug: boolean
  private timeout: number
  private defaultTags: string[]
  private defaultMetadata: Record<string, unknown>

  constructor(config: AIGodfatherConfig) {
    if (!config.apiKey) {
      throw new Error('[AIGodfather] apiKey is required')
    }

    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl || 'https://api.aigodfather.ai').replace(/\/+$/, '')
    this.debug = config.debug ?? false
    this.timeout = config.timeout ?? 10_000
    this.defaultTags = config.defaultTags ?? []
    this.defaultMetadata = config.defaultMetadata ?? {}
  }

  // ── Public Methods ─────────────────────────────────

  /**
   * Test connectivity and retrieve agent info + usage limits.
   */
  async ping(): Promise<PingResponse> {
    return this.request<PingResponse>('GET', '/v1/ping')
  }

  /**
   * Track a custom event.
   */
  async track(eventType: string, options: TrackOptions = {}): Promise<TrackResponse> {
    const body = {
      eventType,
      severity: options.severity ?? 'low',
      message: options.message ?? '',
      metadata: { ...this.defaultMetadata, ...(options.metadata ?? {}) },
      userId: options.userId,
      tags: [...this.defaultTags, ...(options.tags ?? [])],
    }
    return this.request<TrackResponse>('POST', '/v1/events', body)
  }

  /** Track an info-level event. */
  async info(message: string, metadata?: Record<string, unknown>): Promise<TrackResponse> {
    return this.track('info', { severity: 'low', message, metadata })
  }

  /** Track a warning-level event. */
  async warning(message: string, metadata?: Record<string, unknown>): Promise<TrackResponse> {
    return this.track('warning', { severity: 'medium', message, metadata })
  }

  /** Track an error-level event. */
  async error(message: string, metadata?: Record<string, unknown>): Promise<TrackResponse> {
    return this.track('error', { severity: 'high', message, metadata })
  }

  /** Track a critical-level event. */
  async critical(message: string, metadata?: Record<string, unknown>): Promise<TrackResponse> {
    return this.track('critical', { severity: 'critical', message, metadata })
  }

  // ── Private Helpers ────────────────────────────────

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AIGodfather]', ...args)
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`

    this.log(`${method} ${url}`)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'aigodfather-js/1.0.0',
      }

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      }

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body)
        this.log('Body:', JSON.stringify(body, null, 2))
      }

      const response = await fetch(url, options)

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error')
        const error = new Error(`[AIGodfather] HTTP ${response.status}: ${errorBody}`)
        ;(error as any).status = response.status
        ;(error as any).body = errorBody
        throw error
      }

      const data = (await response.json()) as T
      this.log('Response:', JSON.stringify(data, null, 2))
      return data
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`[AIGodfather] Request timed out after ${this.timeout}ms`)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

// ── Default Export ──────────────────────────────────────

export default AIGodfather
