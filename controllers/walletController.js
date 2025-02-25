const Wallet = require('../models/Wallet');

const getWallet = async (req, res) => {
  const { userId } = req.params;

  try {
    const wallet = await Wallet.findOne({ user: userId }).populate('user');
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    res.json(wallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getWallet };