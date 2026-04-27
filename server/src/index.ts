import 'dotenv/config'
import express from 'express'
import { corsMiddleware } from './middleware/cors'
import { connectRedis } from './lib/redis'
import authRoutes from './routes/auth'
import surveyRoutes from './routes/surveys'
import publicRoutes from './routes/public'
import workspaceRoutes from './routes/workspaces'
import inviteRoutes from './routes/invites'
import mfaRoutes from './routes/mfa'

const app = express()
const PORT = process.env.PORT || 4000

app.use(corsMiddleware)
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/surveys', surveyRoutes)
app.use('/s', publicRoutes)
app.use('/workspaces', workspaceRoutes)
app.use('/invite', inviteRoutes)
app.use('/mfa', mfaRoutes)

connectRedis()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => { console.error('Failed to connect to Redis:', err); process.exit(1) })
