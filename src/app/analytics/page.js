'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myUser, setMyUser] = useState(null);

  useEffect(() => {
    fetchUserAndExpenses();
  }, []);

  const fetchUserAndExpenses = async () => {
    setLoading(true);
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
        credentials: 'include'
      });
      if (userRes.status === 401) {
        window.location.href = '/login';
        return;
      }
      const userData = await userRes.json();
      if (userData.success) {
        setMyUser(userData.data);
      }

      const expRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses/me`, {
        credentials: 'include'
      });
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get user's share of an expense
  const getUserShare = (exp) => {
    if (!myUser) return 0;
    const split = exp.splitAmong?.find(s => 
      s.user === myUser._id || s.user?._id === myUser._id
    );
    return split ? split.amount : 0;
  };

  // 1. Calculate Total Spend (User's share)
  const totalSpend = expenses.reduce((acc, curr) => acc + getUserShare(curr), 0);

  // 2. Data for Category Pie Chart
  const categoryMap = {};
  expenses.forEach(exp => {
    const share = getUserShare(exp);
    if (share > 0) {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + share;
    }
  });
  
  const categoryData = {
    labels: Object.keys(categoryMap).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [
      {
        data: Object.values(categoryMap),
        backgroundColor: [
          '#6200EE', '#03DAC6', '#B00020', '#FF9800', '#4CAF50', '#9C27B0'
        ],
        borderWidth: 0,
      },
    ],
  };

  // 3. Data for Monthly Bar Chart
  const monthMap = {};
  expenses.forEach(exp => {
    const share = getUserShare(exp);
    if (share > 0) {
      const date = new Date(exp.date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      monthMap[monthYear] = (monthMap[monthYear] || 0) + share;
    }
  });

  const barData = {
    labels: Object.keys(monthMap),
    datasets: [
      {
        label: 'Monthly Spend (₹)',
        data: Object.values(monthMap),
        backgroundColor: '#6200EE',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--md-text-primary)'
        }
      }
    }
  };

  if (loading) return <div className="p-4 text-center">Loading analytics...</div>;

  return (
    <div className="flex-col gap-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-h5" style={{ margin: 0 }}>Analytics</h1>
      </div>

      {/* Summary Card */}
      <div className="md-card p-4 text-center mb-4" style={{ background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-primary-variant) 100%)', color: 'var(--md-on-primary)' }}>
        <div className="text-body2 mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Expenses</div>
        <div className="text-h4 font-bold">₹{totalSpend.toLocaleString()}</div>
      </div>

      {expenses.length === 0 ? (
        <div className="md-card p-6 text-center text-body1" style={{ color: 'var(--md-text-secondary)' }}>
          No expenses recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          <div className="md-card p-4">
            <h2 className="text-subtitle1 mb-4">Spend by Category</h2>
            <div style={{ height: '250px' }}>
              <Pie data={categoryData} options={chartOptions} />
            </div>
          </div>

          <div className="md-card p-4">
            <h2 className="text-subtitle1 mb-4">Spend over Time</h2>
            <div style={{ height: '250px' }}>
              <Bar 
                data={barData} 
                options={{
                  ...chartOptions,
                  scales: {
                    x: { ticks: { color: 'var(--md-text-secondary)' }, grid: { display: false } },
                    y: { ticks: { color: 'var(--md-text-secondary)' }, grid: { color: 'var(--md-divider)' } }
                  }
                }} 
              />
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
