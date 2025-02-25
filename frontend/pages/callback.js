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
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/verify/${ref}`);
      const { wallet } = response.data;
      const amount = wallet.transactions[wallet.transactions.length - 1].amount; // Last transaction amount
      const balance = wallet.balance;

      // Redirect to success page with query params
      router.push({
        pathname: '/success',
        query: { amount, balance },
      });
    } catch (error) {
      console.error('Verification error:', error);
      router.push('/'); // Redirect to home on failure
    }
  };

  return <div>Processing payment...</div>;
}