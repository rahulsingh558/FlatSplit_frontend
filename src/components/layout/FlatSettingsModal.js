import React, { useState } from 'react';

export default function FlatSettingsModal({ isOpen, onClose, flat, isCreator, isAdmin, onFlatUpdated, onFlatDeleted }) {
  const [name, setName] = useState(flat?.name || '');
  const [settlementType, setSettlementType] = useState(flat?.settlementType || 'overall');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${flat._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, settlementType })
      });
      const data = await res.json();
      
      if (data.success) {
        onFlatUpdated(name, settlementType);
        onClose();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to update group name');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${flat._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        onFlatDeleted();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Group Settings</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {!isDeleting ? (
          <>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Group Name</label>
                <input 
                  type="text" 
                  className="md-input" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isAdmin && !isCreator}
                  required
                />
              </div>

              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Settlement Type</label>
                <select 
                  className="md-input"
                  value={settlementType}
                  onChange={e => setSettlementType(e.target.value)}
                  disabled={!isAdmin && !isCreator}
                >
                  <option value="overall">Overall Settlement (Simplify Debts)</option>
                  <option value="one-to-one">One-to-One (Detailed Peer-to-Peer)</option>
                </select>
                <p className="text-caption mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {settlementType === 'overall' 
                    ? "Calculates minimum transactions needed to settle all group debts." 
                    : "Maintains exact debts based on who paid for whom, without simplifying."}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isCreator && (
                  <button 
                    type="button" 
                    className="md-btn md-btn-outlined" 
                    style={{ borderColor: 'var(--color-error-light)', color: 'var(--color-error)', padding: '6px 12px' }}
                    onClick={() => setIsDeleting(true)}
                  >
                    Delete Group
                  </button>
                )}
                
                {(isAdmin || isCreator) ? (
                  <button type="submit" className="md-btn md-btn-contained" disabled={loading || (name === flat?.name && settlementType === (flat?.settlementType || 'overall'))} style={{ marginLeft: 'auto' }}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' }}>
              <strong>Warning:</strong> Deleting this group will permanently remove all associated expenses, settlements, and messages. This action cannot be undone.
            </div>
            <p className="text-body2">Are you absolutely sure you want to delete <strong>{flat?.name}</strong>?</p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => setIsDeleting(false)} 
                className="md-btn md-btn-text" 
                style={{ color: 'var(--color-text-secondary)' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDelete} 
                className="md-btn md-btn-contained" 
                style={{ backgroundColor: 'var(--color-error)' }}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Yes, Delete Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
