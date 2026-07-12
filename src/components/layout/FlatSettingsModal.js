import React, { useState } from 'react';

export default function FlatSettingsModal({ isOpen, onClose, flat, isCreator, isAdmin, onFlatUpdated, onFlatDeleted }) {
  const [name, setName] = useState(flat?.name || '');
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
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      
      if (data.success) {
        onFlatUpdated(name);
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="md-card flex flex-col w-full" style={{ maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Group Settings</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        {!isDeleting ? (
          <>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-caption">Group Name</label>
                <input 
                  type="text" 
                  className="md-input mt-1" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isAdmin && !isCreator}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                {isCreator && (
                  <button 
                    type="button" 
                    className="md-btn md-btn-outlined" 
                    style={{ borderColor: 'var(--md-error)', color: 'var(--md-error)' }}
                    onClick={() => setIsDeleting(true)}
                  >
                    Delete Group
                  </button>
                )}
                
                {(isAdmin || isCreator) ? (
                  <button type="submit" className="md-btn md-btn-contained" disabled={loading || name === flat?.name}>
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
            <div style={{ padding: '12px', backgroundColor: 'rgba(176, 0, 32, 0.1)', color: 'var(--md-error)', borderRadius: '4px' }}>
              <strong>Warning:</strong> Deleting this group will permanently remove all associated expenses, settlements, and messages. This action cannot be undone.
            </div>
            <p className="text-body2">Are you absolutely sure you want to delete <strong>{flat?.name}</strong>?</p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => setIsDeleting(false)} 
                className="md-btn md-btn-text" 
                style={{ color: 'var(--md-text-secondary)' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDelete} 
                className="md-btn md-btn-contained" 
                style={{ backgroundColor: 'var(--md-error)' }}
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
