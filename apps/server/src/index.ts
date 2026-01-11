import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { config } from 'dotenv'

import { jwtRoutes } from './routes/jwt'
import { documentRoutes } from './routes/documents'

// Load environment variables
config({ path: '../../.env' })

const app = createApp()
const router = createRouter()

// Health check
router.get(
  '/',
  eventHandler(() => ({ status: 'ok', service: 'nutrient-viewer-poc-server' }))
)

// Mount routes
router.use('/api/**', jwtRoutes.handler)
router.use('/api/**', documentRoutes.handler)

app.use(router)

const port = process.env.SERVER_PORT || 3001

listen(toNodeListener(app), {
  port: Number(port),
  showURL: true,
}).then(() => {
  console.log(`Server running on http://localhost:${port}`)
  console.log(`Document Engine URL: ${process.env.DE_URL || 'http://localhost:5000'}`)
})
