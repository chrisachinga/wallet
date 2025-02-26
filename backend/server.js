require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const paymentRoutes = require('./routes/payment')
const authRoutes = require('./routes/auth')

const app = express()

// Use FRONTEND_URL from environment variables, fallback to localhost:3000 for local dev
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'https://localhost:3000'

// CORS configuration
const corsOptions = {
  origin: FRONTEND_URL, // Dynamic origin from env var
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'x-auth-token',
    'x-paystack-signature',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Parse raw body for webhook
app.use(
  '/api/payment/webhook',
  express.raw({ type: 'application/json' })
)
app.use(express.json())

connectDB()

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/payment', paymentRoutes)
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
)
