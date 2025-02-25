import { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import {
  TextField,
  Button,
  Typography,
} from '@mui/material'

export default function FundLink() {
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { link } = router.query

  const handleFund = async () => {
    try {
      setError('')
      const numericAmount = parseFloat(amount)
      if (isNaN(numericAmount) || numericAmount < 100) {
        throw new Error('Amount must be at least 100 KES')
      }
      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw new Error(
          'Please enter a valid email address'
        )
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/fund/link/${link}`,
        { amount: numericAmount, email }
      )
      window.location.href = response.data.authorizationUrl
    } catch (error) {
      console.error(
        'Funding error:',
        error.response?.data || error.message
      )
      setError(error.response?.data?.error || error.message)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant='h4'>Fund Wallet</Typography>
      <TextField
        type='number'
        label='Amount (KES)'
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        fullWidth
        margin='normal'
      />
      <TextField
        type='email'
        label='Your Email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin='normal'
      />
      <Button
        onClick={handleFund}
        variant='contained'
        color='primary'
      >
        Fund Now
      </Button>
      {error && (
        <Typography
          color='error'
          style={{ marginTop: '10px' }}
        >
          {error}
        </Typography>
      )}
    </div>
  )
}

