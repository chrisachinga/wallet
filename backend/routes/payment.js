const express = require('express')
const router = express.Router()
const axios = require('axios')
const Wallet = require('../models/Wallet')
const User = require('../models/User')
const auth = require('../middleware/auth')

router.post('/initialize', auth, async (req, res) => {
  const { amount, email } = req.body
  const userId = req.user.id

  try {
    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = new Wallet({ user: userId })
      await wallet.save()
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100,
        email,
        currency: 'KES',
        callback_url: 'http://localhost:3000/callback',
        metadata: { userId },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    res.json({
      authorizationUrl:
        response.data.data.authorization_url,
    })
  } catch (error) {
    console.error(
      'Payment initialization error:',
      error.message
    )
    res
      .status(500)
      .json({
        error: 'Payment initialization failed',
        details: error.message,
      })
  }
})

router.get('/verify/:reference', auth, async (req, res) => {
  const { reference } = req.params
  const userId = req.user.id

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const { status, amount, metadata } = response.data.data

    if (
      status === 'success' &&
      metadata.userId === userId
    ) {
      const wallet = await Wallet.findOne({ user: userId })
      wallet.balance += amount / 100
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
      })
      await wallet.save()
      res.json({ message: 'Payment verified', wallet })
    } else {
      res
        .status(400)
        .json({
          error: 'Payment not successful or unauthorized',
        })
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    res
      .status(500)
      .json({ error: 'Payment verification failed' })
  }
})

router.get('/wallet', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      user: req.user.id,
    }).populate('user', 'username')
    if (!wallet)
      return res
        .status(404)
        .json({ error: 'Wallet not found' })
    res.json(wallet)
  } catch (error) {
    console.error('Wallet fetch error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post(
  '/fund/link/:fundingLinkId',
  async (req, res) => {
    const { fundingLinkId } = req.params
    const { amount, email } = req.body

    try {
      const user = await User.findOne({ fundingLinkId })
      if (!user)
        return res
          .status(404)
          .json({ error: 'Funding link not found' })

      const wallet = await Wallet.findOne({
        user: user._id,
      })
      if (!wallet)
        return res
          .status(404)
          .json({ error: 'Wallet not found' })

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          amount: amount * 100,
          email,
          currency: 'KES',
          callback_url: 'http://localhost:3000/callback',
          metadata: { userId: user._id.toString() },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      res.json({
        authorizationUrl:
          response.data.data.authorization_url,
      })
    } catch (error) {
      console.error('Funding link error:', error.message)
      res
        .status(500)
        .json({
          error: 'Funding failed',
          details: error.message,
        })
    }
  }
)

router.post('/fund/api', async (req, res) => {
  const { apiKey, amount, email } = req.body

  try {
    const user = await User.findOne({ apiKey })
    if (!user)
      return res
        .status(401)
        .json({ error: 'Invalid API key' })

    const wallet = await Wallet.findOne({ user: user._id })
    if (!wallet)
      return res
        .status(404)
        .json({ error: 'Wallet not found' })

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100,
        email,
        currency: 'KES',
        callback_url: 'http://localhost:3000/callback',
        metadata: { userId: user._id.toString() },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    res.json({
      authorizationUrl:
        response.data.data.authorization_url,
    })
  } catch (error) {
    console.error('API funding error:', error.message)
    res
      .status(500)
      .json({
        error: 'Funding failed',
        details: error.message,
      })
  }
})

router.post('/payout', auth, async (req, res) => {
  const { amount, phoneNumber } = req.body
  const userId = req.user.id

  try {
    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet)
      return res
        .status(404)
        .json({ error: 'Wallet not found' })

    const payoutAmount = parseFloat(amount)
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      return res
        .status(400)
        .json({ error: 'Invalid payout amount' })
    }
    if (wallet.balance < payoutAmount) {
      return res
        .status(400)
        .json({ error: 'Insufficient balance for payout' })
    }

    console.log(
      'Creating M-Pesa recipient for:',
      phoneNumber
    )
    const recipientRes = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'mobile_money',
        name: 'User Payout',
        account_number: phoneNumber, // e.g., +254712345678
        bank_code: 'MPESA', // As per docs for individual M-Pesa users
        currency: 'KES',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    console.log('Recipient created:', recipientRes.data)

    console.log('Initiating transfer')
    const transferRes = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        reason: 'Wallet payout to M-Pesa',
        amount: payoutAmount * 100,
        recipient: recipientRes.data.data.recipient_code,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    console.log('Transfer initiated:', transferRes.data)

    wallet.balance -= payoutAmount
    wallet.transactions.push({
      type: 'debit',
      amount: payoutAmount,
      reference: transferRes.data.data.reference,
    })
    await wallet.save()

    res.json({
      message: 'Payout to M-Pesa initiated',
      transfer: transferRes.data.data,
    })
  } catch (error) {
    console.error(
      'Payout error:',
      error.response?.data || error.message
    )
    res
      .status(500)
      .json({
        error: 'Payout failed',
        details:
          error.response?.data?.message || error.message,
      })
  }
})

module.exports = router
