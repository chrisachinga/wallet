const express = require('express')
const router = express.Router()
const axios = require('axios')
const PDFDocument = require('pdfkit')
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
      const wallet = await Wallet.findOne({
        user: userId,
      }).populate('user', 'username')
      wallet.balance += amount / 100
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
        date: new Date(),
      })
      await wallet.save()

      // Generate receipt
      const doc = new PDFDocument()
      let buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=receipt_${reference}.pdf`
        )
        res.send(pdfData)
      })

      doc
        .fontSize(20)
        .text('Payment Receipt', { align: 'center' })
      doc.moveDown()
      doc
        .fontSize(12)
        .text(`Username: ${wallet.user.username}`)
      doc.text(`Transaction Type: Credit`)
      doc.text(`Amount: KES ${amount / 100}`)
      doc.text(`Reference: ${reference}`)
      doc.text(`Date: ${new Date().toLocaleString()}`)
      doc.end()
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
    const wallet = await Wallet.findOne({
      user: userId,
    }).populate('user', 'username')
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
        account_number: phoneNumber,
        bank_code: 'MPESA',
        currency: 'KES',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

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

    wallet.balance -= payoutAmount
    const reference = transferRes.data.data.reference
    wallet.transactions.push({
      type: 'debit',
      amount: payoutAmount,
      reference,
      date: new Date(),
    })
    await wallet.save()

    // Generate receipt for payout
    const doc = new PDFDocument()
    let buffers = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=receipt_${reference}.pdf`
      )
      res.send(pdfData)
    })

    doc
      .fontSize(20)
      .text('Payout Receipt', { align: 'center' })
    doc.moveDown()
    doc
      .fontSize(12)
      .text(`Username: ${wallet.user.username}`)
    doc.text(`Transaction Type: Debit (Payout)`)
    doc.text(`Amount: KES ${payoutAmount}`)
    doc.text(`Phone Number: ${phoneNumber}`)
    doc.text(`Reference: ${reference}`)
    doc.text(`Date: ${new Date().toLocaleString()}`)
    doc.end()
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

// New endpoint for generating wallet statement
router.get('/statement', auth, async (req, res) => {
  const userId = req.user.id

  try {
    const wallet = await Wallet.findOne({
      user: userId,
    }).populate('user', 'username')
    if (!wallet)
      return res
        .status(404)
        .json({ error: 'Wallet not found' })

    const doc = new PDFDocument()
    let buffers = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=statement_${userId}_${Date.now()}.pdf`
      )
      res.send(pdfData)
    })

    doc
      .fontSize(20)
      .text('Wallet Statement', { align: 'center' })
    doc.moveDown()
    doc
      .fontSize(12)
      .text(`Username: ${wallet.user.username}`)
    doc.text(`Current Balance: KES ${wallet.balance}`)
    doc.text(`Generated On: ${new Date().toLocaleString()}`)
    doc.moveDown()

    doc.text('Transaction History:', { underline: true })
    wallet.transactions.forEach((tx, index) => {
      doc.moveDown(0.5)
      doc.text(`${index + 1}. Type: ${tx.type}`)
      doc.text(`   Amount: KES ${tx.amount}`)
      doc.text(`   Reference: ${tx.reference}`)
      doc.text(
        `   Date: ${new Date(tx.date).toLocaleString()}`
      )
    })

    doc.end()
  } catch (error) {
    console.error(
      'Statement generation error:',
      error.message
    )
    res
      .status(500)
      .json({
        error: 'Statement generation failed',
        details: error.message,
      })
  }
})

module.exports = router
