'use client';

import { useState, useEffect } from 'react';

export default function ExpenseFormModal({ isOpen, onClose, flatId, flatMembers, onSubmitSuccess, myUser }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [splitType, setSplitType] = useState('equal');
  const [receipt, setReceipt] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

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

  // Initialize all members as selected when modal opens
  useEffect(() => {
    if (isOpen && flatMembers && flatMembers.length > 0) {
      setSelectedMembers(flatMembers.map(m => m.user._id));
    }
  }, [isOpen, flatMembers]);

  if (!isOpen) return null;

  const toggleMember = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        // Don't allow deselecting all — at least 1 must remain
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const selectAll = () => {
    setSelectedMembers(flatMembers.map(m => m.user._id));
  };

  const perPersonAmount = selectedMembers.length > 0 && amount
    ? (parseFloat(amount) / selectedMembers.length).toFixed(2)
    : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || selectedMembers.length === 0) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('flatId', flatId);
      formData.append('title', title);
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('splitType', splitType);
      formData.append('selectedMembers', JSON.stringify(selectedMembers));
      formData.append('date', date);
      
      if (receipt) {
        formData.append('receipt', receipt);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
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
          onSubmitSuccess(data.data);
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
      <div className="md-card flex flex-col w-full" style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Add Expense</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label className="text-caption" style={{ color: 'var(--md-text-secondary)', marginBottom: '4px', display: 'block' }}>Title</label>
            <input 
              type="text" 
              className="md-input" 
              placeholder="What was this for?" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-caption" style={{ color: 'var(--md-text-secondary)', marginBottom: '4px', display: 'block' }}>Amount (₹)</label>
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

          {/* Category */}
          <div>
            <label className="text-caption" style={{ color: 'var(--md-text-secondary)', marginBottom: '4px', display: 'block' }}>Category</label>
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

          {/* Date */}
          <div>
            <label className="text-caption" style={{ color: 'var(--md-text-secondary)', marginBottom: '4px', display: 'block' }}>Date</label>
            <input 
              type="date" 
              className="md-input" 
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* Split Among — GPay-style member list */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="text-caption" style={{ color: 'var(--md-text-secondary)' }}>
                Split among ({selectedMembers.length} of {flatMembers?.length || 0})
              </label>
              {selectedMembers.length < (flatMembers?.length || 0) && (
                <button type="button" onClick={selectAll} style={{ 
                  background: 'none', border: 'none', color: 'var(--md-primary)', 
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px'
                }}>
                  Select All
                </button>
              )}
            </div>
            <div style={{ 
              border: '1px solid var(--md-divider)', borderRadius: '12px', 
              overflow: 'hidden', backgroundColor: 'var(--md-surface)' 
            }}>
              {flatMembers && flatMembers.map((member, index) => {
                const isSelected = selectedMembers.includes(member.user._id);
                const isMe = myUser && member.user._id === myUser._id;
                return (
                  <div 
                    key={member.user._id}
                    onClick={() => toggleMember(member.user._id)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px 16px',
                      cursor: 'pointer', userSelect: 'none',
                      borderBottom: index < flatMembers.length - 1 ? '1px solid var(--md-divider)' : 'none',
                      backgroundColor: isSelected ? 'rgba(98, 0, 238, 0.04)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '4px',
                      border: isSelected ? 'none' : '2px solid var(--md-text-disabled)',
                      backgroundColor: isSelected ? 'var(--md-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '14px', flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}>
                      {isSelected && (
                        <span className="material-icons" style={{ fontSize: '16px', color: 'var(--md-on-primary)' }}>check</span>
                      )}
                    </div>
                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--md-primary)' : 'var(--md-text-disabled)',
                      color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: '0.85rem', marginRight: '12px', flexShrink: 0,
                      transition: 'background-color 0.15s ease'
                    }}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Name */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div className="text-body2" style={{ 
                        fontWeight: isSelected ? 500 : 400,
                        color: isSelected ? 'var(--md-text-primary)' : 'var(--md-text-secondary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {member.user.name}{isMe ? ' (You)' : ''}
                      </div>
                    </div>
                    {/* Per-person amount */}
                    {isSelected && amount && (
                      <div className="text-body2" style={{ color: 'var(--md-primary)', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>
                        ₹{perPersonAmount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Summary */}
          {amount && selectedMembers.length > 0 && (
            <div style={{ 
              padding: '12px 16px', backgroundColor: 'rgba(98, 0, 238, 0.06)', 
              borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span className="text-body2" style={{ color: 'var(--md-text-secondary)' }}>
                Split equally among {selectedMembers.length} {selectedMembers.length === 1 ? 'person' : 'people'}
              </span>
              <span className="text-subtitle1" style={{ color: 'var(--md-primary)', fontWeight: 600 }}>
                ₹{perPersonAmount}/person
              </span>
            </div>
          )}

          {/* Receipt */}
          <div>
            <label className="text-caption" style={{ color: 'var(--md-text-secondary)', marginBottom: '4px', display: 'block' }}>Receipt Photo (Optional)</label>
            <input 
              type="file" 
              className="md-input" 
              accept="image/*"
              onChange={e => setReceipt(e.target.files[0])}
            />
            {receipt && <span className="text-caption" style={{ color: 'var(--md-primary)', display: 'block', marginTop: '4px' }}>{receipt.name} selected</span>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="md-btn md-btn-text" style={{ color: 'var(--md-text-secondary)' }}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="md-btn md-btn-contained" 
              disabled={loading || selectedMembers.length === 0}
            >
              {loading ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
