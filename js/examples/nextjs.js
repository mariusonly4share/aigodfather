// lib/monitoring.ts
import { AIGodfather } from 'aigodfather'

let _ai = null

export function getMonitoring() {
  if (!_ai) {
    _ai = new AIGodfather({
      apiKey: process.env.AIGODFATHER_API_KEY,
      debug: process.env.NODE_ENV === 'development'
    })
  }
  return _ai
}

// In any API route or server component:
// const ai = getMonitoring()
// await ai.error('Something failed', { context })
