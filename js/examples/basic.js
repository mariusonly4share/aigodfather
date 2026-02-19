const { AIGodfather } = require('aigodfather')

const ai = new AIGodfather({
  apiKey: process.env.AIGODFATHER_API_KEY,
  debug: true
})

async function main() {
  // Check connection
  const status = await ai.ping()
  console.log(`Connected: ${status.agentName}`)
  console.log(`Events remaining: ${status.limits.remaining}`)

  // Track events
  await ai.info('App started', { version: '1.0.0' })
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
}

main().catch(console.error)
