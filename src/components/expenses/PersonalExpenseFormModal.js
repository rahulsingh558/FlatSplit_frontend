'use client';

import { useState } from 'react';

export default function PersonalExpenseFormModal({ isOpen, onClose, flatId, targetUserId, targetUser, onSubmitSuccess }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [splitType, setSplitType] = useState('equal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'food', label: '🍔 Food' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'shopping', label: '🛍️ Shopping' },
    { value: 'lending', label: '💸 Lending/Borrowing' },
    { value: 'other', label: '📝 Other' },
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/personal-expenses/flat/${flatId}/user/${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          amount,
          category,
          splitType,
          date
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setTitle('');
        setAmount('');
        setCategory('other');
        setSplitType('equal');
        onClose();
        if (onSubmitSuccess) {
          onSubmitSuccess(data.data); 
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create personal expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1600 }}>
      <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Split with {targetUser?.name?.split(' ')[0]}</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>What was this for?</label>
            <input 
              type="text" 
              className="md-input" 
              placeholder="e.g. Dinner, Uber, etc." 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Total Amount (₹)</label>
            <input 
              type="number" 
              className="md-input" 
              placeholder="0.00" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
            <select 
              className="md-input" 
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Date</label>
            <input 
              type="date" 
              className="md-input" 
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Split</label>
            <select 
              className="md-input" 
              value={splitType}
              onChange={e => setSplitType(e.target.value)}
            >
              <option value="equal">Split Equally (50/50)</option>
              <option value="full">They owe the full amount</option>
            </select>
          </div>

          <div style={{ 
            padding: '12px', backgroundColor: 'var(--color-primary-subtle)', 
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)' 
          }}>
            <div className="text-body2 text-center" style={{ color: 'var(--color-text)' }}>
              You paid <strong>₹{amount || '0'}</strong>.
              <br/>
              <span style={{ color: 'var(--color-primary)' }}>
                {targetUser?.name?.split(' ')[0]} will owe you <strong>₹{splitType === 'full' ? (amount || 0) : ((amount || 0) / 2).toFixed(2)}</strong>.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" className="md-btn md-btn-contained" disabled={loading}>
              {loading ? 'Saving...' : 'Add Split'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
