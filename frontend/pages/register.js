import { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import {
  TextField,
  Button,
  Typography,
} from '@mui/material'

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
  })
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, form);
      localStorage.setItem('token', response.data.token);
      router.push('/login');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <Typography variant='h4'>Register</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          name='fullName'
          label='Full Name'
          fullWidth
          margin='normal'
          onChange={handleChange}
        />
        <TextField
          name='username'
          label='Username'
          fullWidth
          margin='normal'
          onChange={handleChange}
        />
        <TextField
          name='email'
          label='Email'
          type='email'
          fullWidth
          margin='normal'
          onChange={handleChange}
        />
        <TextField
          name='phoneNumber'
          label='Phone Number'
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
          Register
        </Button>
      </form>
      {error && (
        <Typography color='error'>{error}</Typography>
      )}
      <Button
        onClick={() => router.push('/login')}
        style={{ marginTop: '10px' }}
      >
        Already have an account? Login
      </Button>
    </div>
  )
}
