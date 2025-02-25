import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const userId = 'user123'; // Hardcoded for demo

  const handlePayment = async (selectedAmount) => {
    try {
      setError('');
      const numericAmount = selectedAmount || parseFloat(amount); // Use preset or custom amount
      
      // Validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      if (isNaN(numericAmount) || numericAmount < 100) {
        throw new Error('Amount must be at least 100 KES');
      }

      console.log('Sending payload:', { userId, amount: numericAmount, email });
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/initialize`, {
        userId,
        amount: numericAmount,
        email,
      });
      window.location.href = response.data.authorizationUrl;
    } catch (error) {
      console.error('Error initializing payment:', error.response?.data || error.message);
      setError(error.response?.data?.details || error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Payment Wallet (KES)</h1>
      
      {/* Custom Amount Input */}
      <input
        type="number"
        placeholder="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      
      {/* Email Input */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      
      {/* Custom Amount Button */}
      <button
        onClick={() => handlePayment()}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          marginRight: '10px',
          cursor: 'pointer',
        }}
      >
        Fund Wallet
      </button>
      
      {/* Preset Amount Buttons */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => {
            setAmount('100'); // Optional: Set input for visual feedback
            handlePayment(100);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          Pay 100 KES
        </button>
        <button
          onClick={() => {
            setAmount('7999'); // Optional: Set input for visual feedback
            handlePayment(7999);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Pay 7999 KES
        </button>
      </div>
      
      {/* Error Display */}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}