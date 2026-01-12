import { createApp, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { config } from 'dotenv'

import { jwtRoutes } from './routes/jwt'
import { documentRoutes } from './routes/documents'

// Load environment variables
config({ path: '../../.env' })

const app = createApp()

// Mount route handlers directly
app.use(jwtRoutes)
app.use(documentRoutes)

const port = process.env.SERVER_PORT || 3001

listen(toNodeListener(app), {
  port: Number(port),
  showURL: true,
}).then(() => {
  console.log(`Server running on http://localhost:${port}`)
  console.log(`Document Engine URL: ${process.env.DE_URL || 'http://localhost:5000'}`)
})
