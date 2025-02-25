const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'KES' },
  transactions: [
    {
      type: { type: String, enum: ['credit', 'debit'], required: true },
      amount: { type: Number, required: true },
      reference: { type: String, required: true },
      date: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model('Wallet', walletSchema);