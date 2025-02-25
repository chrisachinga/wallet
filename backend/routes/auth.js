const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const auth = require('../middleware/auth')

router.post('/register', async (req, res) => {
  const {
    fullName,
    username,
    email,
    phoneNumber,
    password,
  } = req.body

  try {
    let user = await User.findOne({ email })
    if (user)
      return res
        .status(400)
        .json({ error: 'User already exists' })

    user = new User({
      fullName,
      username,
      email,
      phoneNumber,
      password,
    })
    user.password = await bcrypt.hash(password, 20)
    await user.save()

    let wallet = await Wallet.findOne({ user: user._id })
    if (!wallet) {
      wallet = new Wallet({ user: user._id })
      await wallet.save()
    }

    const payload = { id: user._id }
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.json({
      token,
      fundingLinkId: user.fundingLinkId,
      apiKey: user.apiKey,
    })
  } catch (error) {
    console.error(
      'Registration error:',
      error.message,
      error.stack
    )
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user)
      return res
        .status(400)
        .json({ error: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(
      password,
      user.password
    )
    if (!isMatch)
      return res
        .status(400)
        .json({ error: 'Invalid credentials' })

    const payload = { id: user._id }
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.json({
      token,
      fundingLinkId: user.fundingLinkId,
      apiKey: user.apiKey,
    })
  } catch (error) {
    console.error(
      'Login error:',
      error.message,
      error.stack
    )
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    })
  }
})

router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '-password'
    )
    if (!user)
      return res
        .status(404)
        .json({ error: 'User not found' })
    res.json(user)
  } catch (error) {
    console.error('User fetch error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
