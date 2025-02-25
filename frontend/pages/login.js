import { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import {
  TextField,
  Button,
  Typography,
} from '@mui/material'

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        form
      )
      localStorage.setItem('token', response.data.token)
      router.push('/dashboard')
    } catch (error) {
      setError(
        error.response?.data?.error || 'Login failed'
      )
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <Typography variant='h4'>Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          name='email'
          label='Email'
          type='email'
          fullWidth
          margin='normal'
          onChange={handleChange}
        />
        <TextField
          name='password'
          label='Password'
          type='password'
          fullWidth
          margin='normal'
          onChange={handleChange}
        />
        <Button
          type='submit'
          variant='contained'
          color='primary'
          fullWidth
          style={{ marginTop: '20px' }}
        >
          Login
        </Button>
      </form>
      {error && (
        <Typography color='error'>{error}</Typography>
      )}
      <Button
        onClick={() => router.push('/register')}
        style={{ marginTop: '10px' }}
      >
        Don’t have an account? Register
      </Button>
    </div>
  )
}
