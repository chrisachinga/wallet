// Utility function to get token from localStorage
const getToken = () => localStorage.getItem('token');

// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error);
    }
  } catch (error) {
    alert('Registration failed');
  }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error);
    }
  } catch (error) {
    alert('Login failed');
  }
});

// Load Dashboard
if (window.location.pathname === '/dashboard.html') {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
  } else {
    loadWallet();
  }
}

async function loadWallet() {
  try {
    const token = getToken();
    // Assume user ID is stored in token payload or fetched separately
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const userId = decoded.id;

    const response = await fetch(`/api/payments/wallet/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wallet = await response.json();

    document.getElementById('balance').textContent = `KES ${wallet.balance}`;
    const transactions = wallet.transactions.map(tx => `
      <tr>
        <td>${new Date(tx.date).toLocaleDateString()}</td>
        <td>${tx.type}</td>
        <td>${tx.amount}</td>
        <td>${tx.reference}</td>
      </tr>
    `).join('');
    document.getElementById('transactions').innerHTML = transactions;
  } catch (error) {
    alert('Failed to load wallet');
  }
}

async function fundWallet() {
  const amount = prompt('Enter amount to fund (KES):');
  if (!amount) return;

  try {
    const token = getToken();
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const email = decoded.email || 'test@example.com'; // Adjust as needed

    const response = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, amount }),
    });
    const data = await response.json();
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      alert('Payment initialization failed');
    }
  } catch (error) {
    alert('Failed to fund wallet');
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}