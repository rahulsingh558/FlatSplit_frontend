'use client';

import { useState } from 'react';

export default function ExpenseFormModal({ isOpen, onClose, flatId, flatMembers, onSubmitSuccess }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [splitType, setSplitType] = useState('equal');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'groceries', label: '🥬 Groceries' },
    { value: 'rent', label: '🏠 Rent' },
    { value: 'electricity', label: '⚡ Electricity' },
    { value: 'cook', label: '👨‍🍳 Cook' },
    { value: 'gas', label: '⛽ Gas' },
    { value: 'water', label: '💧 Water' },
    { value: 'maintenance', label: '🔧 Maintenance' },
    { value: 'other', label: '📝 Other' },
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('flatId', flatId);
      formData.append('title', title);
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('splitType', splitType);
      
      // For basic flow, we use equal split among everyone. 
      // Advanced splits (custom/percentages) require more UI, sticking to 'equal' for this version
      
      if (receipt) {
        formData.append('receipt', receipt);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses`, {
        method: 'POST',
        credentials: 'include',
        body: formData, // fetch handles multipart/form-data boundary automatically
      });

      const data = await res.json();
      
      if (data.success) {
        setTitle('');
        setAmount('');
        setReceipt(null);
        setCategory('other');
        setSplitType('equal');
        onClose();
        if (onSubmitSuccess) {
          onSubmitSuccess(data.data); // Return the populated message
        }
      } else {
        console.error(data.error);
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="md-card flex flex-col w-full" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h6" style={{ margin: 0 }}>Add Expense</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-caption">Title</label>
            <input 
              type="text" 
              className="md-input mt-1" 
              placeholder="What was this for?" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-caption">Amount (₹)</label>
            <input 
              type="number" 
              className="md-input mt-1" 
              placeholder="0.00" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="text-caption">Category</label>
            <select 
              className="md-input mt-1" 
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-caption">Split Options</label>
            <select 
              className="md-input mt-1" 
              value={splitType}
              onChange={e => setSplitType(e.target.value)}
            >
              <option value="equal">Split equally among everyone</option>
              {/* Other options can be added here as UI gets more complex */}
            </select>
          </div>

          <div>
            <label className="text-caption">Receipt Photo (Optional)</label>
            <input 
              type="file" 
              className="md-input mt-1" 
              accept="image/*"
              onChange={e => setReceipt(e.target.files[0])}
            />
            {receipt && <span className="text-caption" style={{ color: 'var(--md-primary)', display: 'block', marginTop: '4px' }}>{receipt.name} selected</span>}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="md-btn md-btn-text" style={{ color: 'var(--md-text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" className="md-btn md-btn-contained" disabled={loading}>
              {loading ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
