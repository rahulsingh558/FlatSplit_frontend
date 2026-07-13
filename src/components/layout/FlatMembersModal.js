import React, { useState } from 'react';
import Link from 'next/link';
import PersonalExpenseFormModal from '../expenses/PersonalExpenseFormModal';

export default function FlatMembersModal({ isOpen, onClose, flat, myUser }) {
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMemberForSplit, setSelectedMemberForSplit] = useState(null); // The user object to split with

  if (!isOpen) return null;

  const isCreator = myUser && flat && (flat.createdBy === myUser._id || flat.createdBy?._id === myUser._id);
  const isAdmin = myUser && flat && flat.members.some(m => m.user._id === myUser._id && m.role === 'admin');
  const canManageMembers = isCreator || isAdmin;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${flat._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsAdding(false);
        setEmail('');
        // Trigger a refresh somehow, or rely on socket/parent reload
        window.location.reload(); 
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${flat._id}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalSplitSuccess = () => {
    setSelectedMemberForSplit(null);
    // Optionally trigger a refresh of feed
    window.location.reload();
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="text-h6" style={{ margin: 0 }}>Group Members</h2>
            <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <div style={{ 
            backgroundColor: 'var(--color-primary-subtle)', padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', marginBottom: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div className="text-caption" style={{ color: 'var(--color-primary)' }}>Invite Code</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
                {flat?.inviteCode}
              </div>
            </div>
            <button 
              className="md-btn-text" 
              style={{ color: 'var(--color-primary)', padding: '8px' }}
              onClick={() => {
                navigator.clipboard.writeText(flat?.inviteCode);
                alert('Invite code copied to clipboard!');
              }}
            >
              <span className="material-symbols-rounded">content_copy</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {flat?.members.map(member => (
              <div key={member.user._id} style={{ 
                display: 'flex', alignItems: 'center', padding: '12px 16px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '0.875rem', marginRight: '12px'
                }}>
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="text-body1 font-medium" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.user.name} {myUser && member.user._id === myUser._id && '(You)'}
                  </div>
                  <div className="text-caption" style={{ textTransform: 'capitalize' }}>
                    {member.role}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {myUser && member.user._id !== myUser._id && (
                    <>
                      <Link 
                        href={`/user?flatId=${flat._id}&userId=${member.user._id}`}
                        className="md-btn-text" 
                        style={{ color: 'var(--color-primary)', padding: '6px', minWidth: 'auto', display: 'flex', alignItems: 'center' }}
                        title="Personal chat"
                        onClick={onClose}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>chat</span>
                      </Link>
                      
                      <button 
                        className="md-btn-text" 
                        style={{ color: 'var(--color-text-secondary)', padding: '6px', minWidth: 'auto' }}
                        title="Split personally"
                        onClick={() => setSelectedMemberForSplit(member.user)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>call_split</span>
                      </button>
                    </>
                  )}

                  {canManageMembers && myUser && member.user._id !== myUser._id && (
                    <button 
                      className="md-btn-text" 
                      style={{ color: 'var(--color-error)', padding: '6px', minWidth: 'auto' }}
                      title="Remove member"
                      onClick={() => handleRemoveMember(member.user._id)}
                      disabled={loading}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>person_remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canManageMembers && (
            isAdding ? (
              <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="email" 
                  className="md-input" 
                  placeholder="Enter user's email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setIsAdding(false)} className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }}>
                    Cancel
                  </button>
                  <button type="submit" className="md-btn md-btn-contained" disabled={loading}>
                    {loading ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setIsAdding(true)} 
                className="md-btn md-btn-outlined w-full flex justify-center items-center gap-2"
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
              >
                <span className="material-symbols-rounded">person_add</span>
                Add Member Manually
              </button>
            )
          )}
        </div>
      </div>

      {/* Personal Split Modal nested/rendered on top */}
      <PersonalExpenseFormModal 
        isOpen={!!selectedMemberForSplit}
        onClose={() => setSelectedMemberForSplit(null)}
        flatId={flat?._id}
        targetUserId={selectedMemberForSplit?._id}
        targetUser={selectedMemberForSplit}
        onSubmitSuccess={handlePersonalSplitSuccess}
      />
    </>
  );
}
