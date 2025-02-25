const axios = require('axios');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const Wallet = require('../models/Wallet');
const User = require('../models/User');

const initializePayment = async (req, res) => {
  const { email, amount } = req.body; // Amount in KES

  try {
    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name: email.split('@')[0] });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }

    // Initialize Paystack transaction
    const response = await Paystack.transaction.initialize({
      email,
      amount: amount * 100, // Convert to kobo (Paystack expects smallest currency unit)
      currency: 'KES', // Kenyan Shillings
      callback_url: 'http://localhost:3000/api/payments/callback', // Callback URL
    });

    res.json({
      authorization_url: response.data.authorization_url,
      reference: response.data.reference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  try {
    const response = await Paystack.transaction.verify({ reference });
    const { status, amount, customer } = response.data;

    if (status === 'success') {
      const user = await User.findOne({ email: customer.email });
      const wallet = await Wallet.findOne({ user: user._id });

      // Update wallet balance (amount is in kobo, convert to KES)
      wallet.balance += amount / 100;
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
      });
      await wallet.save();

      res.redirect('/success'); // Redirect to a success page
    } else {
      res.redirect('/failure'); // Redirect to a failure page
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

const handleWebhook = async (req, res) => {
  const event = req.body;

  // Verify Paystack webhook signature
  const signature = req.headers['x-paystack-signature'];
  // In production, validate signature using Paystack's secret key and HMAC SHA512
  // For simplicity, skipping detailed signature verification here

  if (event.event === 'charge.success') {
    const { reference, amount, customer } = event.data;

    const user = await User.findOne({ email: customer.email });
    const wallet = await Wallet.findOne({ user: user._id });

    // Check if transaction already processed (idempotency)
    if (!wallet.transactions.some((tx) => tx.reference === reference)) {
      wallet.balance += amount / 100; // Convert to KES
      wallet.transactions.push({
        type: 'credit',
        amount: amount / 100,
        reference,
      });
      await wallet.save();
    }
  }

  res.sendStatus(200); // Acknowledge webhook
};

module.exports = { initializePayment, verifyPayment, handleWebhook };