import { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Callback() {
  const router = useRouter();
  const { reference } = router.query;

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    }
  }, [reference]);

  const verifyPayment = async (ref) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/verify/${ref}`, {
        headers: { 'x-auth-token': token },
      });
      const { wallet } = response.data;
      const amount = wallet.transactions[wallet.transactions.length - 1].amount;
      const balance = wallet.balance;

      router.push({
        pathname: '/success',
        query: { amount, balance },
      });
    } catch (error) {
      console.error('Verification error:', error);
      router.push('/');
    }
  };

  return <div>Processing payment...</div>;
}