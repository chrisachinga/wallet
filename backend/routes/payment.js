const express = require('express');
const router = express.Router();
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const Wallet = require('../models/Wallet');

router.post('/initialize', async (req, res) => {
  const { userId, amount, email } = req.body;

  try {
    const wallet = await Wallet.findOne({ userId }) || new Wallet({ userId });
    await wallet.save();

    const response = await paystack.transaction.initialize({
      amount: amount * 100, // Convert to kobo (Paystack uses smallest currency unit)
      email,
      currency: 'KES', // Kenyan Shillings
      callback_url: 'http://localhost:3000/callback', // Next.js callback page
      metadata: { userId },
    });

    res.json({ authorizationUrl: response.data.authorization_url });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await paystack.transaction.verify({ reference });
    const { status, amount, metadata } = response.data;

    if (status === 'success') {
      const wallet = await Wallet.findOne({ userId: metadata.userId });
      wallet.balance += amount / 100; // Convert back from kobo
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
      });
      await wallet.save();
      res.json({ message: 'Payment verified', wallet });
    } else {
      res.status(400).json({ error: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;