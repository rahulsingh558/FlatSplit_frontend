'use client';

import React, { useState, useEffect } from 'react';

export default function SplitBreakdownModal({ isOpen, onClose, expense, flatMembers, myUser, onExpenseUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  
  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('other');
  const [editSplitType, setEditSplitType] = useState('equal');
  const [editSelectedMembers, setEditSelectedMembers] = useState([]);
  const [editCustomAmounts, setEditCustomAmounts] = useState({});
  const [editPercentages, setEditPercentages] = useState({});
  const [receipt, setReceipt] = useState(null);
  
  const [loading, setLoading] = useState(false);

  // Initialize edit state when entering edit mode
  useEffect(() => {
    if (isEditing && expense) {
      setEditTitle(expense.title);
      setEditAmount(expense.amount);
      setEditCategory(expense.category);
      setEditSplitType(expense.splitType || 'equal');
      
      const memberIds = expense.splitAmong.map(s => s.user._id || s.user);
      setEditSelectedMembers(memberIds);

      // Initialize custom amounts / percentages from existing split
      if (expense.splitType === 'custom') {
        const customObj = {};
        expense.splitAmong.forEach(s => { customObj[s.user._id || s.user] = s.amount; });
        setEditCustomAmounts(customObj);
      }
      
      // If it was percentage, we don't have the original percentages saved in the DB, 
      // but we can calculate them back from the amount if we want, or leave them empty
      if (expense.splitType === 'percentage') {
        const pctObj = {};
        expense.splitAmong.forEach(s => { 
          pctObj[s.user._id || s.user] = ((s.amount / expense.amount) * 100).toFixed(2); 
        });
        setEditPercentages(pctObj);
      }
      
      setReceipt(null); // Reset receipt file input
    }
  }, [isEditing, expense]);

  if (!isOpen || !expense) return null;

  const isCreator = myUser && (expense.createdBy === myUser._id || expense.createdBy?._id === myUser._id);
  const isClosed = expense.status === 'closed';

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

  const getUserName = (userId) => {
    const member = flatMembers?.find(m => m.user._id === userId || m.user === userId);
    return member ? member.user.name : 'Unknown User';
  };

  const getAvatarLetter = (userId) => {
    const name = getUserName(userId);
    return name.charAt(0).toUpperCase();
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('amount', editAmount);
      formData.append('category', editCategory);
      formData.append('splitType', editSplitType);
      formData.append('selectedMembers', JSON.stringify(editSelectedMembers));

      if (editSplitType === 'custom') {
        const customArr = editSelectedMembers.map(id => ({ user: id, amount: editCustomAmounts[id] || 0 }));
        formData.append('customAmounts', JSON.stringify(customArr));
      }
      if (editSplitType === 'percentage') {
        const pctArr = editSelectedMembers.map(id => ({ user: id, percentage: editPercentages[id] || 0 }));
        formData.append('percentages', JSON.stringify(pctArr));
      }

      if (receipt) {
        formData.append('receipt', receipt);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses/${expense._id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        if (onExpenseUpdated) onExpenseUpdated(data.data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isClosed ? 'open' : 'closed';
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses/${expense._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (onExpenseUpdated) onExpenseUpdated(data.data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId) => {
    setEditSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) return prev; // At least one member required
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input 
                type="text" className="md-input" value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ marginBottom: '8px' }}
                placeholder="Title"
              />
            ) : (
              <h2 className="text-h6" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {expense.title}
                {isClosed && (
                  <span style={{ 
                    fontSize: '0.625rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-tertiary)',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>Closed</span>
                )}
              </h2>
            )}
            <div className="text-caption" style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Total: {isEditing ? (
                <input 
                  type="number" className="md-input" value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  style={{ width: '120px', display: 'inline-block', padding: '6px 10px', fontSize: '0.875rem' }}
                  step="0.01"
                  placeholder="Amount"
                />
              ) : (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>₹{expense.amount}</span>
              )}
            </div>
          </div>
          <button onClick={() => { setIsEditing(false); onClose(); }} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Paid By (View Mode) */}
        {!isEditing && (
          <div className="text-subtitle2" style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
            Paid by {getUserName(expense.paidBy._id || expense.paidBy)}
          </div>
        )}

        {/* Category & Receipt (Edit Mode) */}
        {isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
              <select className="md-input" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Update Receipt (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setReceipt(e.target.files[0])}
                className="md-input" 
                style={{ padding: '8px' }}
              />
            </div>
          </div>
        )}

        {/* Receipt Image (View Mode) */}
        {!isEditing && expense.photos && expense.photos.length > 0 && (() => {
          const photoUrl = expense.photos[0].url;
          const resolvedUrl = photoUrl.startsWith('http') 
            ? photoUrl 
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${photoUrl}`;
          return (
          <div style={{ marginBottom: '20px' }}>
            <div className="text-caption" style={{ marginBottom: '8px', fontWeight: 600 }}>RECEIPT</div>
            <div 
              style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', cursor: 'zoom-in' }}
              onClick={() => setFullScreenImage(resolvedUrl)}
            >
              <img 
                src={resolvedUrl} 
                alt="Receipt" 
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '200px', objectFit: 'contain', backgroundColor: 'var(--color-surface-hover)' }} 
              />
            </div>
          </div>
          );
        })()}

        {/* Split Section */}
        <div style={{ marginBottom: '20px' }}>
          <div className="text-caption" style={{ marginBottom: '10px', fontWeight: 600 }}>
            {isEditing ? 'EDIT SPLIT CONFIGURATION' : 'SPLIT AMONG'}
          </div>

          {/* Edit Mode Tabs */}
          {isEditing && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {['equal', 'percentage', 'custom'].map(type => (
                <button
                  key={type}
                  onClick={() => setEditSplitType(type)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 600,
                    backgroundColor: editSplitType === type ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                    color: editSplitType === type ? '#fff' : 'var(--color-text-secondary)',
                    border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Member List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isEditing ? (
              // EDIT MODE MEMBER LIST
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {flatMembers?.map((member, index) => {
                  const isSelected = editSelectedMembers.includes(member.user._id);
                  return (
                    <div key={member.user._id} style={{
                      display: 'flex', alignItems: 'center', padding: '10px 14px',
                      borderBottom: index < flatMembers.length - 1 ? '1px solid var(--color-divider)' : 'none',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                    }}>
                      {/* Checkbox */}
                      <div onClick={() => toggleMember(member.user._id)} style={{
                        width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer',
                        border: isSelected ? 'none' : '2px solid var(--color-text-tertiary)',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: '12px', flexShrink: 0,
                        transition: 'all var(--transition-fast)'
                      }}>
                        {isSelected && <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
                      </div>
                      
                      {/* Name */}
                      <span className="text-body2" style={{ flex: 1, color: isSelected ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                        {member.user.name}
                      </span>

                      {/* Inputs (only if selected) */}
                      {isSelected && (
                        <div>
                          {editSplitType === 'equal' && editAmount && (
                            <span className="text-body2" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              ₹{(parseFloat(editAmount) / editSelectedMembers.length).toFixed(2)}
                            </span>
                          )}
                          {editSplitType === 'percentage' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input 
                                type="number" 
                                className="md-input" 
                                style={{ width: '70px', padding: '6px', textAlign: 'right' }}
                                placeholder="0"
                                value={editPercentages[member.user._id] || ''}
                                onChange={e => setEditPercentages(prev => ({...prev, [member.user._id]: e.target.value}))}
                              />
                              <span className="text-caption">%</span>
                            </div>
                          )}
                          {editSplitType === 'custom' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="text-caption">₹</span>
                              <input 
                                type="number" 
                                className="md-input" 
                                style={{ width: '90px', padding: '6px', textAlign: 'right' }}
                                placeholder="0.00"
                                step="0.01"
                                value={editCustomAmounts[member.user._id] || ''}
                                onChange={e => setEditCustomAmounts(prev => ({...prev, [member.user._id]: e.target.value}))}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // VIEW MODE MEMBER LIST
              expense.splitAmong?.map((split, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', backgroundColor: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  opacity: isClosed ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '12px', fontSize: '0.75rem', fontWeight: 600
                    }}>
                      {getAvatarLetter(split.user._id || split.user)}
                    </div>
                    <span className="text-body2 font-medium" style={{ color: 'var(--color-text)' }}>
                      {getUserName(split.user._id || split.user)}
                    </span>
                  </div>
                  <div className="text-body2" style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: isClosed ? 'line-through' : 'none' }}>
                    ₹{split.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
          {isCreator && !isEditing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setIsEditing(true)} 
                className="md-btn md-btn-outlined" 
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                disabled={loading}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                Edit
              </button>
              <button 
                onClick={handleToggleStatus}
                className="md-btn md-btn-outlined" 
                style={{ 
                  color: isClosed ? 'var(--color-text-secondary)' : 'var(--color-error)',
                  borderColor: isClosed ? 'var(--color-border)' : 'var(--color-error-light)'
                }}
                disabled={loading}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{isClosed ? 'lock_open' : 'check_circle'}</span>
                {loading ? '...' : (isClosed ? 'Reopen' : 'Close')}
              </button>
            </div>
          )}
          {isEditing && (
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditing(false)} className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="md-btn md-btn-contained" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
          {!isEditing && (
            <button onClick={() => { setIsEditing(false); onClose(); }} className="md-btn md-btn-contained" style={{ marginLeft: 'auto' }}>
              Done
            </button>
          )}
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          onClick={() => setFullScreenImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyItems: 'center',
            cursor: 'zoom-out'
          }}
        >
          <button 
            onClick={() => setFullScreenImage(null)}
            style={{
              position: 'absolute', top: '24px', right: '24px',
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              borderRadius: 'var(--radius-full)', width: '44px', height: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>close</span>
          </button>
          <img 
            src={fullScreenImage} 
            alt="Receipt Fullscreen" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', margin: 'auto' }} 
          />
        </div>
      )}
    </div>
  );
}
