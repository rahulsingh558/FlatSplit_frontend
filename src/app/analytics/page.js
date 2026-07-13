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

  // 1. Calculate Summary Metrics
  const totalPaid = expenses.filter(e => e.paidBy?._id === myUser?._id).reduce((acc, curr) => acc + curr.amount, 0);
  const totalShare = expenses.reduce((acc, curr) => acc + getUserShare(curr), 0);
  const netBalance = totalPaid - totalShare;

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
          '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4'
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
        backgroundColor: '#3B82F6',
        borderRadius: 6,
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
          color: 'var(--color-text-secondary)',
          font: { family: 'Inter', size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        }
      }
    }
  };

  if (loading) return <div className="p-2" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading analytics...</div>;

  return (
    <div className="flex-col" style={{ paddingBottom: '80px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="text-h5" style={{ margin: 0 }}>Analytics</h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="md-card" style={{ padding: '20px', textAlign: 'center', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9, marginBottom: '6px' }}>Total Paid by Me</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{totalPaid.toLocaleString()}</div>
        </div>
        <div className="md-card" style={{ padding: '20px', textAlign: 'center', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9, marginBottom: '6px' }}>My Total Share</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{totalShare.toLocaleString()}</div>
        </div>
        <div className="md-card" style={{ padding: '20px', textAlign: 'center', background: netBalance >= 0 ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9, marginBottom: '6px' }}>{netBalance >= 0 ? 'I Will Get' : 'I Will Pay'}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{Math.abs(netBalance).toLocaleString()}</div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="md-card" style={{ padding: '40px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--color-text-tertiary)', marginBottom: '12px', display: 'block' }}>insert_chart</span>
          <p className="text-body1" style={{ color: 'var(--color-text-secondary)' }}>No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: '16px' }}>
          
          <div className="md-card" style={{ padding: '20px' }}>
            <h2 className="text-subtitle1" style={{ marginBottom: '16px', fontWeight: 600 }}>Spend by Category</h2>
            <div style={{ height: '250px' }}>
              <Pie data={categoryData} options={chartOptions} />
            </div>
          </div>

          <div className="md-card" style={{ padding: '20px' }}>
            <h2 className="text-subtitle1" style={{ marginBottom: '16px', fontWeight: 600 }}>Spend over Time</h2>
            <div style={{ height: '250px' }}>
              <Bar 
                data={barData} 
                options={{
                  ...chartOptions,
                  scales: {
                    x: { 
                      ticks: { color: 'var(--color-text-tertiary)', font: { family: 'Inter', size: 11 } }, 
                      grid: { display: false } 
                    },
                    y: { 
                      ticks: { color: 'var(--color-text-tertiary)', font: { family: 'Inter', size: 11 } }, 
                      grid: { color: 'var(--color-divider)' } 
                    }
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
