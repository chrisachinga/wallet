const express = require('express');
const router = express.Router();
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const Wallet = require('../models/Wallet');
const auth = require('../middleware/auth');

router.post('/initialize', auth, async (req, res) => {
  const { amount, email } = req.body;
  const userId = req.user.id; // From JWT

  try {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }

    const response = await paystack.transaction.initialize({
      amount: amount * 100,
      email,
      currency: 'KES',
      callback_url: 'http://localhost:3000/callback',
      metadata: { userId },
    });

    res.json({ authorizationUrl: response.data.authorization_url });
  } catch (error) {
    console.error('Payment initialization error:', error.message);
    res.status(500).json({ error: 'Payment initialization failed', details: error.message });
  }
});

router.get('/verify/:reference', auth, async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  try {
    const response = await paystack.transaction.verify({ reference });
    const { status, amount, metadata } = response.data;

    if (status === 'success' && metadata.userId === userId) {
      const wallet = await Wallet.findOne({ user: userId });
      wallet.balance += amount / 100;
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
      });
      await wallet.save();
      res.json({ message: 'Payment verified', wallet });
    } else {
      res.status(400).json({ error: 'Payment not successful or unauthorized' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

router.get('/wallet', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id }).populate('user', 'username');
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json(wallet);
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;