import { useRouter } from 'next/router';

export default function Success() {
  const router = useRouter();
  const { amount, balance } = router.query; // Passed from callback

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Payment Successful!</h1>
      <p>Thank you for your payment.</p>
      <p>
        <strong>Amount Credited:</strong> KES {amount || 'N/A'}
      </p>
      <p>
        <strong>Updated Wallet Balance:</strong> KES {balance || 'N/A'}
      </p>
      <button
        onClick={() => router.push('/')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Back to Home
      </button>
    </div>
  );
}