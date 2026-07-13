'use client';

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [myUser, setMyUser] = useState(null);
  const [allMembers, setAllMembers] = useState([]); // All unique members across flats
  const [selectedUserId, setSelectedUserId] = useState('all'); // Filter by user
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const reportRef = useRef(null);

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

        // Extract all unique members from expenses (paidBy users)
        const memberMap = new Map();
        expData.data.forEach(exp => {
          if (exp.paidBy?._id && exp.paidBy?.name) {
            memberMap.set(exp.paidBy._id, exp.paidBy);
          }
        });
        setAllMembers(Array.from(memberMap.values()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FlatSplit-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="p-2" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading reports...</div>;

  const getUserShare = (exp) => {
    if (!myUser) return 0;
    const split = exp.splitAmong?.find(s => 
      s.user === myUser._id || s.user?._id === myUser._id
    );
    return split ? split.amount : 0;
  };

  // Apply user filter
  const filteredExpenses = expenses.filter(exp => {
    if (selectedUserId === 'all') return true;
    if (selectedUserId === 'mine') return exp.paidBy?._id === myUser?._id;
    return exp.paidBy?._id === selectedUserId;
  });

  const relevantExpenses = filteredExpenses.filter(exp => getUserShare(exp) > 0);
  const totalSpend = relevantExpenses.reduce((acc, curr) => acc + getUserShare(curr), 0);

  const selectedFilterLabel = selectedUserId === 'all' 
    ? 'All Members' 
    : selectedUserId === 'mine'
      ? 'Paid by Me'
      : allMembers.find(m => m._id === selectedUserId)?.name || 'Unknown';

  return (
    <div className="flex-col" style={{ paddingBottom: '80px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="text-h5" style={{ margin: 0 }}>Monthly Reports</h1>
        <button 
          onClick={generatePDF} 
          disabled={isGenerating || relevantExpenses.length === 0}
          className="md-btn md-btn-contained flex items-center"
          style={{ gap: '6px' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download</span>
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* User Filter */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <div className="text-caption" style={{ marginBottom: '8px', fontWeight: 600 }}>
          Filter by who paid
        </div>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="md-card"
          style={{
            width: '100%', padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', transition: 'border-color var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>
              {selectedUserId === 'all' ? 'group' : 'person'}
            </span>
            <span className="text-body1" style={{ fontWeight: 500 }}>{selectedFilterLabel}</span>
          </div>
          <span className="material-symbols-rounded" style={{ 
            color: 'var(--color-text-tertiary)', 
            transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform var(--transition-fast)',
            fontSize: '20px'
          }}>
            expand_more
          </span>
        </button>

        {/* Filter Dropdown */}
        {isFilterOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            marginTop: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)'
          }}>
            {/* All option */}
            <button
              onClick={() => { setSelectedUserId('all'); setIsFilterOpen(false); }}
              style={{
                width: '100%', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: selectedUserId === 'all' ? 'var(--color-primary-light)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--color-divider)'
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>group</span>
              </div>
              <span className="text-body2" style={{ fontWeight: selectedUserId === 'all' ? 600 : 400, color: 'var(--color-text)' }}>
                All Members
              </span>
              {selectedUserId === 'all' && (
                <span className="material-symbols-rounded" style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontSize: '18px' }}>check</span>
              )}
            </button>

            {/* My expenses option */}
            <button
              onClick={() => { setSelectedUserId('mine'); setIsFilterOpen(false); }}
              style={{
                width: '100%', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: selectedUserId === 'mine' ? 'var(--color-primary-light)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--color-divider)'
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>person</span>
              </div>
              <span className="text-body2" style={{ fontWeight: selectedUserId === 'mine' ? 600 : 400, color: 'var(--color-text)' }}>
                Paid by Me
              </span>
              {selectedUserId === 'mine' && (
                <span className="material-symbols-rounded" style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontSize: '18px' }}>check</span>
              )}
            </button>

            {/* Individual members */}
            {allMembers.filter(m => m._id !== myUser?._id).map(member => (
              <button
                key={member._id}
                onClick={() => { setSelectedUserId(member._id); setIsFilterOpen(false); }}
                style={{
                  width: '100%', padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  backgroundColor: selectedUserId === member._id ? 'var(--color-primary-light)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid var(--color-divider)'
                }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {member.name.charAt(0)}
                </div>
                <span className="text-body2" style={{ fontWeight: selectedUserId === member._id ? 600 : 400, color: 'var(--color-text)' }}>
                  {member.name}
                </span>
                {selectedUserId === member._id && (
                  <span className="material-symbols-rounded" style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontSize: '18px' }}>check</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click-away overlay for dropdown */}
      {isFilterOpen && (
        <div 
          onClick={() => setIsFilterOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
        />
      )}

      <div className="md-card" style={{ padding: '24px', overflowX: 'auto' }}>
        
        {/* Hidden/Printable Area for PDF */}
        <div ref={reportRef} style={{ padding: '24px', backgroundColor: '#FFFFFF', color: '#000000', minWidth: '700px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '2px solid #2563EB', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, color: '#2563EB', fontSize: '24px', fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>FlatSplit</h1>
              <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>Expense Summary Report</p>
              {selectedUserId !== 'all' && (
                <p style={{ margin: '4px 0 0 0', color: '#2563EB', fontSize: '13px', fontWeight: 500 }}>
                  Filter: {selectedFilterLabel}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>Date: {new Date().toLocaleDateString()}</p>
              <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13px' }}>Generated Automatically</p>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F8F8FA', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Total Net Expenses</h3>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#2563EB', fontWeight: 700 }}>₹{totalSpend.toLocaleString()}</h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#2563EB', color: 'white' }}>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd' }}>Group/Flat</th>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd' }}>Description</th>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd' }}>Category</th>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd' }}>Paid By</th>
                <th style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {relevantExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '16px', textAlign: 'center', border: '1px solid #ddd', color: '#6B7280' }}>
                    No expenses found for this period.
                  </td>
                </tr>
              ) : (
                relevantExpenses.map(exp => (
                  <tr key={exp._id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{exp.flat?.name || 'Unknown'}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{exp.title}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textTransform: 'capitalize' }}>{exp.category}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{exp.paidBy?.name || 'Unknown'}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'right', fontWeight: 600 }}>₹{getUserShare(exp).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div style={{ marginTop: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '11px' }}>
            <p>End of Report</p>
            <p>© {new Date().getFullYear()} FlatSplit</p>
          </div>
        </div>

      </div>
    </div>
  );
}
