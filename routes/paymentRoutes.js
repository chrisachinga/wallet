const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
} = require('../controllers/paymentController');
const { getWallet } = require('../controllers/walletController');

router.post('/initialize', initializePayment);
router.get('/callback', verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/wallet/:userId', getWallet);

module.exports = router;