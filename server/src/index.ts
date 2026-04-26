import express from 'express'
import { corsMiddleware } from './middleware/cors'
import authRoutes from './routes/auth'
import surveyRoutes from './routes/surveys'
import publicRoutes from './routes/public'

const app = express()
const PORT = process.env.PORT || 4000

app.use(corsMiddleware)
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/surveys', surveyRoutes)
app.use('/s', publicRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
