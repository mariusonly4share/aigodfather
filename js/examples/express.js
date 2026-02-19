const express = require('express')
const { AIGodfather } = require('aigodfather')

const ai = new AIGodfather({
  apiKey: process.env.AIGODFATHER_API_KEY,
  debug: process.env.NODE_ENV === 'development'
})

const app = express()

// Monitoring middleware
app.use(async (req, res, next) => {
  const start = Date.now()

  res.on('finish', async () => {
    const duration = Date.now() - start

    // Alert on slow requests
    if (duration > 2000) {
      await ai.warning('Slow request', {
        path: req.path,
        method: req.method,
        durationMs: duration
      })
    }

    // Alert on server errors
    if (res.statusCode >= 500) {
      await ai.error(`HTTP ${res.statusCode}`, {
        path: req.path,
        method: req.method,
        durationMs: duration
      })
    }
  })

  next()
})

// Global error handler
app.use((err, req, res, next) => {
  ai.critical(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method
  })
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(3000, async () => {
  await ai.info('Express server started', { port: 3000 })
  console.log('Server running on :3000')
})
