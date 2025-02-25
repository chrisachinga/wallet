require('dotenv').config()
const express = require('express')
const connectDB = require('./config/db')
const paymentRoutes = require('./routes/paymentRoutes')
const authRoutes = require('./routes/authRoutes')
const path = require('path')
const jwt = require('jsonwebtoken')

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public'))) // Serve static files

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token)
    return res
      .status(401)
      .json({ error: 'No token provided' })

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    )
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Connect to MongoDB
connectDB()

// Routes
// Apply to protected routes
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
