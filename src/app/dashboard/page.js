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

  return (
    <div className="flex-col gap-3">
      <div className="flex justify-between items-center mb-2">
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
          style={{ color: 'var(--md-text-secondary)', padding: '8px', minWidth: '40px', borderRadius: '50%' }}
          title="Refresh App"
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>refresh</span>
        </button>
      </div>

      <h2 className="text-overline" style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--md-text-secondary)', marginBottom: '8px' }}>
        Your Flats & Groups
      </h2>
      
      {loading ? (
        <p className="text-body2">Loading groups...</p>
      ) : flats.length === 0 ? (
        <div className="md-card flex flex-col items-center justify-center p-2" style={{ padding: '32px' }}>
          <p className="text-body1 mb-2" style={{ color: 'var(--md-text-secondary)' }}>You aren't part of any flats yet.</p>
          <button className="md-btn md-btn-outlined" onClick={() => setIsModalOpen(true)}>Create or Join a Flat</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {flats.map(flat => (
            <Link href={`/feed/flat/${flat._id}`} key={flat._id}>
              <div className="md-card interactive flex items-center justify-between" style={{ padding: '16px' }}>
                
                <div className="flex items-center gap-2">
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', 
                    backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', fontWeight: 500
                  }}>
                    {flat.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-subtitle1" style={{ lineHeight: 1.2 }}>{flat.name}</div>
                    <div className="text-body2">{flat.members.length} members</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {flat.unread > 0 && (
                    <div style={{
                      minWidth: '24px', height: '24px', borderRadius: '12px', padding: '0 6px',
                      backgroundColor: 'var(--md-error)', color: 'var(--md-on-error)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {flat.unread}
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <span className="material-icons" style={{ color: 'var(--md-text-secondary)' }}>chevron_right</span>
                    <span className="text-caption" style={{ backgroundColor: 'rgba(98, 0, 238, 0.1)', color: 'var(--md-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                      Code: {flat.inviteCode}
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
          <span className="material-icons">add</span>
        </button>
      </div>

      {/* Create/Join Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="md-card flex flex-col w-full" style={{ maxWidth: '400px', padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-h6" style={{ margin: 0 }}>{modalMode === 'create' ? 'Create Flat' : 'Join Flat'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
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
                  <label className="text-caption">Flat / Group Name</label>
                  <input 
                    type="text" 
                    className="md-input mt-1" 
                    placeholder="e.g. Green Heights 302" 
                    value={flatName}
                    onChange={e => setFlatName(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="text-caption">Invite Code</label>
                  <input 
                    type="text" 
                    className="md-input mt-1" 
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
