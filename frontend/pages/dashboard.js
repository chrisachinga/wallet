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
  Modal,
} from '@mui/material'

export default function Dashboard() {
  const [wallet, setWallet] = useState(null)
  const [userData, setUserData] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [statementUrl, setStatementUrl] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null) // For receipt preview
  const [openReceiptModal, setOpenReceiptModal] =
    useState(false) // Modal state
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
        { headers: { 'x-auth-token': token } }
      )

      setPayoutAmount('')
      setPhoneNumber('')
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
          responseType: 'blob',
        }
      )

      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/pdf',
        })
      )
      setStatementUrl(url)
    } catch (error) {
      console.error('Statement generation error:', error)
    }
  }

  const handleDownloadStatement = () => {
    if (statementUrl) {
      const link = document.createElement('a')
      link.href = statementUrl
      link.setAttribute(
        'download',
        `statement_${Date.now()}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const handleGenerateReceipt = async (reference) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/receipt/${reference}`,
        {
          headers: { 'x-auth-token': token },
          responseType: 'blob',
        }
      )

      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/pdf',
        })
      )
      setReceiptUrl(url)
      setOpenReceiptModal(true) // Open modal
    } catch (error) {
      console.error('Receipt generation error:', error)
    }
  }

  const handleDownloadReceipt = () => {
    if (receiptUrl) {
      const link = document.createElement('a')
      link.href = receiptUrl
      link.setAttribute(
        'download',
        `receipt_${Date.now()}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const handleCloseReceiptModal = () => {
    setOpenReceiptModal(false)
    setReceiptUrl(null) // Clear receipt URL when closing
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
        {statementUrl && (
          <Box mt={2}>
            <Typography>Statement Preview:</Typography>
            <iframe
              src={statementUrl}
              width='100%'
              height='500px'
              style={{ border: '1px solid #ccc' }}
            />
            <Button
              variant='outlined'
              color='primary'
              onClick={handleDownloadStatement}
              style={{ marginTop: '10px' }}
            >
              Download Statement
            </Button>
          </Box>
        )}
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
            <TableCell>Action</TableCell>
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
              <TableCell>
                <Button
                  variant='outlined'
                  color='primary'
                  size='small'
                  onClick={() =>
                    handleGenerateReceipt(tx.reference)
                  }
                >
                  Generate Receipt
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Receipt Preview Modal */}
      <Modal
        open={openReceiptModal}
        onClose={handleCloseReceiptModal}
        aria-labelledby='receipt-modal-title'
        aria-describedby='receipt-modal-description'
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: 800,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography
            id='receipt-modal-title'
            variant='h6'
            component='h2'
          >
            Receipt Preview
          </Typography>
          {receiptUrl && (
            <Box mt={2}>
              <iframe
                src={receiptUrl}
                width='100%'
                height='400px'
                style={{ border: '1px solid #ccc' }}
              />
              <Box
                mt={2}
                display='flex'
                justifyContent='space-between'
              >
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleDownloadReceipt}
                >
                  Download
                </Button>
                <Button
                  variant='outlined'
                  color='secondary'
                  onClick={handleCloseReceiptModal}
                >
                  Close
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>
    </div>
  )
}
