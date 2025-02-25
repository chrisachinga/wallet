import { buffer } from 'micro';
import Wallet from '../../backend/models/Wallet'; // Import from backend (adjust path or replicate schema)
import mongoose from 'mongoose';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['x-paystack-signature'];
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const buf = await buffer(req);
  const payload = buf.toString();

  // Verify webhook signature (simplified; use crypto for production)
  if (!sig || !verifySignature(payload, sig, secret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);
  if (event.event === 'charge.success') {
    const { reference, amount, metadata } = event.data;
    await mongoose.connect(process.env.MONGO_URI); // Connect to DB
    const wallet = await Wallet.findOne({ userId: metadata.userId });
    if (wallet) {
      wallet.balance += amount / 100;
      wallet.transactions.push({ type: 'credit', amount: amount / 100, reference });
      await wallet.save();
    }
  }

  res.status(200).end();
}

function verifySignature(payload, signature, secret) {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}