require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const paymentRoutes = require('./routes/payment')
const authRoutes = require('./routes/auth')

const app = express()

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000', // Frontend origin in dev; update for production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json())
connectDB()

// Simple health check endpoint to test server status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/payment', paymentRoutes)
app.use('/api/auth', authRoutes)

// Use Render's assigned port or fallback to 5000 for local dev
const PORT = process.env.PORT || 5000
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
)
