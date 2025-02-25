import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import {
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Box,
} from '@mui/material'

export default function Dashboard() {
  const [wallet, setWallet] = useState(null)
  const [userData, setUserData] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')

        const [walletRes, userRes] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/payment/wallet`,
            {
              headers: { 'x-auth-token': token },
            }
          ),
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`,
            {
              headers: { 'x-auth-token': token },
            }
          ),
        ])

        setWallet(walletRes.data)
        setUserData(userRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/login')
      }
    }
    fetchData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handlePayout = async () => {
    try {
      setPayoutError('')
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/payout`,
        { amount: payoutAmount, phoneNumber },
        {
          headers: { 'x-auth-token': token },
          responseType: 'blob', // For PDF download
        }
      )

      // Download payout receipt
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/pdf',
        })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `receipt_${Date.now()}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()

      setPayoutAmount('')
      setPhoneNumber('')
      // Refresh wallet data
      const walletRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/wallet`,
        {
          headers: { 'x-auth-token': token },
        }
      )
      setWallet(walletRes.data)
    } catch (error) {
      console.error(
        'Payout error:',
        error.response?.data || error.message
      )
      setPayoutError(
        error.response?.data?.error || 'Payout failed'
      )
    }
  }

  const handleGenerateStatement = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/statement`,
        {
          headers: { 'x-auth-token': token },
          responseType: 'blob', // For PDF download
        }
      )

      // Download statement
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/pdf',
        })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `statement_${Date.now()}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Statement generation error:', error)
    }
  }

  if (!wallet || !userData) return <div>Loading...</div>

  const fundingLink = userData.fundingLinkId
    ? `http://localhost:3000/fund/${userData.fundingLinkId}`
    : 'Funding link not generated yet'

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant='h4'>Dashboard</Typography>
      <Typography>
        Welcome, {wallet.user.username}
      </Typography>
      <Typography>Balance: KES {wallet.balance}</Typography>
      <Button
        variant='contained'
        color='primary'
        onClick={() => router.push('/')}
        style={{ margin: '10px 0' }}
      >
        Fund Wallet
      </Button>
      <Button
        variant='outlined'
        color='secondary'
        onClick={handleLogout}
        style={{ marginLeft: '10px' }}
      >
        Logout
      </Button>

      <Box mt={4}>
        <Typography variant='h6'>
          Payout Funds to M-Pesa
        </Typography>
        <TextField
          type='number'
          label='Amount (KES)'
          value={payoutAmount}
          onChange={(e) => setPayoutAmount(e.target.value)}
          fullWidth
          margin='normal'
        />
        <TextField
          type='text'
          label='M-Pesa Phone Number (e.g., +254700123456)'
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          fullWidth
          margin='normal'
        />
        <Button
          variant='contained'
          color='secondary'
          onClick={handlePayout}
          disabled={
            !payoutAmount ||
            !phoneNumber ||
            wallet.balance <= 0
          }
          style={{ marginTop: '10px' }}
        >
          Payout to M-Pesa
        </Button>
        {payoutError && (
          <Typography
            color='error'
            style={{ marginTop: '10px' }}
          >
            {payoutError}
          </Typography>
        )}
      </Box>

      <Box mt={2}>
        <Button
          variant='contained'
          color='primary'
          onClick={handleGenerateStatement}
        >
          Generate Statement
        </Button>
      </Box>

      <Typography
        variant='h6'
        style={{ marginTop: '20px' }}
      >
        Your Funding Details
      </Typography>
      <Typography>
        Funding Link:{' '}
        {userData.fundingLinkId ? (
          <a href={fundingLink}>{fundingLink}</a>
        ) : (
          fundingLink
        )}
      </Typography>
      <Typography>
        API Key: {userData.apiKey || 'Not available'}
      </Typography>

      <Typography
        variant='h6'
        style={{ marginTop: '20px' }}
      >
        Transaction History
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Amount (KES)</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {wallet.transactions.map((tx, index) => (
            <TableRow key={index}>
              <TableCell>{tx.type}</TableCell>
              <TableCell>{tx.amount}</TableCell>
              <TableCell>{tx.reference}</TableCell>
              <TableCell>
                {new Date(tx.date).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
