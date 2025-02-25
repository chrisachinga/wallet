import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(''); // Add error state for feedback
  const userId = 'user123'; // Hardcoded for demo

  const handlePayment = async () => {
    try {
      setError(''); // Clear previous errors
      const numericAmount = parseFloat(amount);
      
      // Basic validation
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
      setError(error.response?.data?.details || error.message); // Show error to user
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Payment Wallet (KES)</h1>
      <input
        type="number"
        placeholder="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handlePayment}>Fund Wallet</button>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error */}
    </div>
  );
}