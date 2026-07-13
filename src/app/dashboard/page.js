'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'join'
  const [flatName, setFlatName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFlats = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats`, {
        credentials: 'include'
      });
      
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setFlats(data.data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch flats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  const handleCreateJoin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = modalMode === 'create' ? '/api/flats' : '/api/flats/join';
      const body = modalMode === 'create' ? { name: flatName } : { inviteCode };
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFlatName('');
        setInviteCode('');
        fetchFlats(); // Refresh list
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a consistent soft color from a string
  const getAvatarColor = (name) => {
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex-col gap-3">
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="text-h5" style={{ margin: 0 }}>Chats</h1>
        <button 
          onClick={() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
                window.location.reload(true);
              });
            } else {
              window.location.reload(true);
            }
          }}
          className="md-btn-text" 
          style={{ color: 'var(--color-text-tertiary)', padding: '8px', minWidth: '40px', borderRadius: 'var(--radius-full)' }}
          title="Refresh App"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>refresh</span>
        </button>
      </div>

      <div className="text-caption" style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
        Your Flats & Groups
      </div>
      
      {loading ? (
        <p className="text-body2">Loading groups...</p>
      ) : flats.length === 0 ? (
        <div className="md-card flex flex-col items-center justify-center" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>group_add</span>
          <p className="text-body1" style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>You aren't part of any flats yet.</p>
          <button className="md-btn md-btn-contained" onClick={() => setIsModalOpen(true)}>Create or Join a Flat</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {flats.map(flat => (
            <Link href={`/feed/flat/${flat._id}`} key={flat._id}>
              <div className="md-card interactive flex items-center justify-between" style={{ padding: '14px 16px' }}>
                
                <div className="flex items-center gap-2" style={{ gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-md)', 
                    backgroundColor: getAvatarColor(flat.name), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 600
                  }}>
                    {flat.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-subtitle1" style={{ lineHeight: 1.3 }}>{flat.name}</div>
                    <div className="text-body2" style={{ fontSize: '0.75rem' }}>{flat.members.length} members</div>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: '12px' }}>
                  {flat.unread > 0 && (
                    <div style={{
                      minWidth: '22px', height: '22px', borderRadius: 'var(--radius-full)', padding: '0 6px',
                      backgroundColor: 'var(--color-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 700
                    }}>
                      {flat.unread}
                    </div>
                  )}
                  <div className="flex flex-col items-end" style={{ gap: '4px' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--color-text-tertiary)', fontSize: '20px' }}>chevron_right</span>
                    <span style={{ 
                      backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', 
                      padding: '2px 8px', borderRadius: 'var(--radius-full)', 
                      fontSize: '0.625rem', fontWeight: 600 
                    }}>
                      {flat.inviteCode}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <div style={{ position: 'fixed', bottom: '80px', right: '24px', zIndex: 100 }}>
        <button className="md-fab" title="New Group" onClick={() => setIsModalOpen(true)}>
          <span className="material-symbols-rounded">add</span>
        </button>
      </div>

      {/* Create/Join Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '400px', padding: '24px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
              <h2 className="text-h6" style={{ margin: 0 }}>{modalMode === 'create' ? 'Create Flat' : 'Join Flat'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="flex gap-2" style={{ marginBottom: '20px' }}>
              <button 
                className={`md-btn ${modalMode === 'create' ? 'md-btn-contained' : 'md-btn-outlined'}`} 
                onClick={() => setModalMode('create')}
                style={{ flex: 1 }}
              >
                Create
              </button>
              <button 
                className={`md-btn ${modalMode === 'join' ? 'md-btn-contained' : 'md-btn-outlined'}`} 
                onClick={() => setModalMode('join')}
                style={{ flex: 1 }}
              >
                Join
              </button>
            </div>

            <form onSubmit={handleCreateJoin} className="flex flex-col gap-3">
              {modalMode === 'create' ? (
                <div>
                  <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Flat / Group Name</label>
                  <input 
                    type="text" 
                    className="md-input" 
                    placeholder="e.g. Green Heights 302" 
                    value={flatName}
                    onChange={e => setFlatName(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Invite Code</label>
                  <input 
                    type="text" 
                    className="md-input" 
                    placeholder="Enter invite code" 
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button type="submit" className="md-btn md-btn-contained" disabled={isSubmitting}>
                  {isSubmitting ? 'Loading...' : (modalMode === 'create' ? 'Create' : 'Join')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
