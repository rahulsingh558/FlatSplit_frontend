import React from 'react';
import { useRouter } from 'next/navigation';

export default function FlatMembersModal({ isOpen, onClose, flat, myUser }) {
  const router = useRouter();

  if (!isOpen || !flat) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="md-card flex flex-col w-full" style={{ maxWidth: '400px', padding: '24px', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Group Members</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {flat.members.map((member) => {
            const isMe = myUser && member.user._id === myUser._id;
            
            return (
              <div 
                key={member.user._id} 
                className={!isMe ? "interactive" : ""}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '12px', 
                  backgroundColor: 'var(--md-surface)', borderRadius: '8px',
                  border: '1px solid var(--md-divider)',
                  cursor: !isMe ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (!isMe) {
                    router.push(`/feed/flat/${flat._id}/user/${member.user._id}`);
                  }
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 500, marginRight: '16px'
                }}>
                  {member.user.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-subtitle1" style={{ margin: 0 }}>
                    {member.user.name} {isMe && '(You)'}
                  </div>
                  <div className="text-caption" style={{ color: 'var(--md-text-secondary)' }}>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </div>
                </div>
                {!isMe && (
                  <span className="material-icons" style={{ color: 'var(--md-text-secondary)' }}>
                    chat
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
