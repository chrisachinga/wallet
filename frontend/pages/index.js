import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Button, TextField, Typography } from '@mui/material';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/login');
  }, [router]);

  const handlePayment = async (selectedAmount) => {
    try {
      setError('');
      const numericAmount = selectedAmount || parseFloat(amount);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      if (isNaN(numericAmount) || numericAmount < 100) {
        throw new Error('Amount must be at least 100 KES');
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/initialize`,
        { amount: numericAmount, email },
        { headers: { 'x-auth-token': token } }
      );
      window.location.href = response.data.authorizationUrl;
    } catch (error) {
      console.error('Error initializing payment:', error.response?.data || error.message);
      setError(error.response?.data?.details || error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4">Fund Your Wallet (KES)</Typography>
      <TextField
        type="number"
        label="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button
        onClick={() => handlePayment()}
        variant="contained"
        color="primary"
        style={{ marginRight: '10px' }}
      >
        Fund Wallet
      </Button>
      <Button onClick={() => router.push('/dashboard')} variant="outlined">
        Back to Dashboard
      </Button>
      <div style={{ marginTop: '20px' }}>
        <Button
          onClick={() => handlePayment(100)}
          variant="contained"
          color="success"
          style={{ marginRight: '10px' }}
        >
          Pay 100 KES
        </Button>
        <Button onClick={() => handlePayment(7999)} variant="contained" color="success">
          Pay 7999 KES
        </Button>
      </div>
      {error && <Typography color="error" style={{ marginTop: '10px' }}>{error}</Typography>}
    </div>
  );
}