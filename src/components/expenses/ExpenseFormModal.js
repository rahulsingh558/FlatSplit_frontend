'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function ExpenseFormModal({ isOpen, onClose, flatId, flatMembers, onSubmitSuccess, myUser }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      
      // Check for pending shared receipt
      const pendingReceipt = sessionStorage.getItem('pendingSharedReceipt');
      const pendingReceiptPath = sessionStorage.getItem('pendingSharedReceiptPath');
      
      if (pendingReceipt) {
        fetch(pendingReceipt)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'shared_receipt.jpg', { type: blob.type });
            setReceipt(file);
            sessionStorage.removeItem('pendingSharedReceipt');
          })
          .catch(err => console.error('Error parsing shared receipt', err));
      } else if (pendingReceiptPath) {
        // Use Capacitor to convert the local file path to a web URL
        const webUrl = Capacitor.convertFileSrc(pendingReceiptPath);
        fetch(webUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'shared_receipt.jpg', { type: blob.type || 'image/jpeg' });
            setReceipt(file);
            sessionStorage.removeItem('pendingSharedReceiptPath');
          })
          .catch(err => console.error('Error fetching native shared receipt', err));
      }
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (isOpen && flatMembers && flatMembers.length > 0) {
      setSelectedMembers(flatMembers.map(m => m.user._id));
      setSplitMethod('equal');
      setSplitValues({});
    }
  }, [isOpen, flatMembers]);

  if (!isOpen) return null;

  const toggleMember = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) return prev;
        const next = prev.filter(id => id !== memberId);
        setSplitValues(sv => {
          const newSv = { ...sv };
          delete newSv[memberId];
          return newSv;
        });
        return next;
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    setReceipt(file || null);
    
    if (file) {
      setIsScanning(true);
      try {
        const formData = new FormData();
        formData.append('receipt', file);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses/parse-receipt`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const data = await res.json();
        
        if (data.success && data.data) {
           const parsed = data.data;
           if (parsed.title) setTitle(parsed.title);
           if (parsed.amount) setAmount(parsed.amount.toString());
           if (parsed.date) {
             const d = new Date(parsed.date);
             if (!isNaN(d.getTime())) {
               setDate(d.toISOString().split('T')[0]);
             }
           }
        } else {
           console.warn("API parsing error or missing data:", data.error);
        }
      } catch (err) {
        console.error('Smart Scanning failed:', err);
        alert("Smart Scanning failed: " + err.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const selectAll = () => {
    setSelectedMembers(flatMembers.map(m => m.user._id));
  };

  const getCalculatedAmounts = () => {
    const totalAmount = parseFloat(amount) || 0;
    const finalAmounts = {};
    const selectedCount = selectedMembers.length;
    
    if (selectedCount === 0 || totalAmount <= 0) return {};

    if (splitMethod === 'equal') {
      const splitAmount = totalAmount / selectedCount;
      selectedMembers.forEach(id => finalAmounts[id] = splitAmount);
      return finalAmounts;
    }

    const membersWithInput = [];
    const membersWithoutInput = [];
    
    selectedMembers.forEach(id => {
      const val = parseFloat(splitValues[id]);
      if (!isNaN(val) && val >= 0) {
        membersWithInput.push({ id, val });
      } else {
        membersWithoutInput.push(id);
      }
    });

    if (splitMethod === 'amount') {
      let sumEntered = 0;
      membersWithInput.forEach(m => {
        sumEntered += m.val;
        finalAmounts[m.id] = m.val;
      });
      
      const remainder = totalAmount - sumEntered;
      if (membersWithoutInput.length > 0) {
        const splitRemainder = Math.max(0, remainder) / membersWithoutInput.length;
        membersWithoutInput.forEach(id => finalAmounts[id] = splitRemainder);
      }
      return finalAmounts;
    }

    if (splitMethod === 'share') {
      let totalShares = 0;
      const memberShares = {};
      
      selectedMembers.forEach(id => {
        const val = parseFloat(splitValues[id]);
        const share = (!isNaN(val) && val > 0) ? val : 1;
        memberShares[id] = share;
        totalShares += share;
      });
      
      selectedMembers.forEach(id => {
        finalAmounts[id] = (memberShares[id] / totalShares) * totalAmount;
      });
      return finalAmounts;
    }

    if (splitMethod === 'percentage') {
      let sumEntered = 0;
      membersWithInput.forEach(m => {
        sumEntered += m.val;
        finalAmounts[m.id] = (m.val / 100) * totalAmount;
      });
      
      const remainingPercent = 100 - sumEntered;
      if (membersWithoutInput.length > 0) {
        const splitPercent = Math.max(0, remainingPercent) / membersWithoutInput.length;
        membersWithoutInput.forEach(id => {
          finalAmounts[id] = (splitPercent / 100) * totalAmount;
        });
      }
      return finalAmounts;
    }
    
    return finalAmounts;
  };

  const calculatedAmounts = getCalculatedAmounts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || selectedMembers.length === 0) return;

    const totalAmount = parseFloat(amount) || 0;
    
    if (splitMethod === 'amount') {
      const sum = selectedMembers.reduce((acc, id) => acc + (parseFloat(splitValues[id]) || 0), 0);
      const emptyCount = selectedMembers.filter(id => isNaN(parseFloat(splitValues[id]))).length;
      if (emptyCount === 0 && Math.abs(sum - totalAmount) > 0.01) {
        alert("The entered amounts don't sum up to the total.");
        return;
      }
      if (sum > totalAmount) {
        alert("The entered amounts exceed the total amount.");
        return;
      }
    }

    if (splitMethod === 'percentage') {
      const sum = selectedMembers.reduce((acc, id) => acc + (parseFloat(splitValues[id]) || 0), 0);
      const emptyCount = selectedMembers.filter(id => isNaN(parseFloat(splitValues[id]))).length;
      if (emptyCount === 0 && Math.abs(sum - 100) > 0.01) {
        alert("The entered percentages don't sum up to 100%.");
        return;
      }
      if (sum > 100) {
        alert("The entered percentages exceed 100%.");
        return;
      }
    }

    setLoading(true);

    try {
      const customAmountsArray = selectedMembers.map(id => ({
        user: id,
        amount: parseFloat((calculatedAmounts[id] || 0).toFixed(2))
      }));
      
      const totalSum = customAmountsArray.reduce((acc, curr) => acc + curr.amount, 0);
      const diff = totalAmount - totalSum;
      if (customAmountsArray.length > 0 && Math.abs(diff) > 0) {
        customAmountsArray[0].amount = parseFloat((customAmountsArray[0].amount + diff).toFixed(2));
      }

      const formData = new FormData();
      formData.append('flatId', flatId);
      formData.append('title', title);
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('splitType', 'custom'); 
      formData.append('customAmounts', JSON.stringify(customAmountsArray));
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
        setSplitMethod('equal');
        setSplitValues({});
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
    <div className="modal-overlay">
      <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Add Expense</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-variant, #f8f9fa)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
            <label className="text-caption" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--color-primary)' }}>
              Upload Receipt (Optional)
            </label>
            <input 
              type="file" 
              className="md-input" 
              accept="image/*"
              onChange={handleReceiptChange}
              style={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
            />
            {receipt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '8px', backgroundColor: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>image</span>
                <span className="text-caption" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{receipt.name} selected</span>
                <button type="button" onClick={() => setReceipt(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', marginLeft: 'auto' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            )}
            {isScanning && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span className="text-caption" style={{ color: 'var(--color-primary)' }}>Scanning receipt for details...</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Title</label>
            <input 
              type="text" 
              className="md-input" 
              placeholder="What was this for?" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Amount (₹)</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="text-caption">
                Split among ({selectedMembers.length} of {flatMembers?.length || 0})
              </label>
              {selectedMembers.length < (flatMembers?.length || 0) && (
                <button type="button" onClick={selectAll} style={{ 
                  background: 'none', border: 'none', color: 'var(--color-primary)', 
                  cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600, padding: '4px 8px'
                }}>
                  Select All
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { id: 'equal', label: '= Evenly' },
                { id: 'amount', label: '₹ Amounts' },
                { id: 'share', label: '◴ Shares' },
                { id: 'percentage', label: '% Percent' }
              ].map(method => (
                <button 
                  key={method.id}
                  type="button"
                  onClick={() => { setSplitMethod(method.id); setSplitValues({}); }}
                  className={`md-btn ${splitMethod === method.id ? 'md-btn-contained' : 'md-btn-outlined'}`}
                  style={{ borderRadius: 'var(--radius-full)', padding: '6px 12px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div style={{ 
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
              overflow: 'hidden', backgroundColor: 'var(--color-surface)' 
            }}>
              {flatMembers && flatMembers.map((member, index) => {
                const isSelected = selectedMembers.includes(member.user._id);
                const isMe = myUser && member.user._id === myUser._id;
                return (
                  <div 
                    key={member.user._id}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '10px 14px',
                      borderBottom: index < flatMembers.length - 1 ? '1px solid var(--color-divider)' : 'none',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <div 
                      onClick={() => toggleMember(member.user._id)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        border: isSelected ? 'none' : '2px solid var(--color-text-tertiary)',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: '12px', flexShrink: 0, cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}>
                      {isSelected && (
                        <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#fff' }}>check</span>
                      )}
                    </div>
                    
                    <div style={{
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                      color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: '0.75rem', marginRight: '10px', flexShrink: 0,
                      transition: 'background-color var(--transition-fast)'
                    }}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div className="text-body2" style={{ 
                        fontWeight: isSelected ? 500 : 400,
                        color: isSelected ? 'var(--color-text)' : 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {member.user.name}{isMe ? ' (You)' : ''}
                      </div>
                    </div>

                    {isSelected && splitMethod !== 'equal' && (
                      <div style={{ flexShrink: 0, width: '70px', marginLeft: '8px' }}>
                        <input 
                          type="number"
                          className="md-input"
                          style={{ padding: '6px 8px', fontSize: '0.75rem', textAlign: 'right', borderColor: 'var(--color-border)' }}
                          placeholder={splitMethod === 'share' ? '1' : '0'}
                          value={splitValues[member.user._id] || ''}
                          onChange={(e) => setSplitValues(prev => ({ ...prev, [member.user._id]: e.target.value }))}
                          step="any"
                          min="0"
                        />
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="text-body2" style={{ color: 'var(--color-primary)', fontWeight: 600, flexShrink: 0, marginLeft: '12px', width: '60px', textAlign: 'right' }}>
                        ₹{calculatedAmounts[member.user._id] ? calculatedAmounts[member.user._id].toFixed(2) : '0.00'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receipt photo upload moved to top */}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }}>
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
