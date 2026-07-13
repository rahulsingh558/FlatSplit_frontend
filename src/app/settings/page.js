'use client';

import { useState, useEffect } from 'react';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Initialize dark mode state
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    if (typeof window !== 'undefined') {
      const newIsDark = !isDarkMode;
      setIsDarkMode(newIsDark);
      if (newIsDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
        credentials: 'include'
      });
      
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        setName(data.data.name || '');
        setPhone(data.data.phone || '');
        setUpiId(data.data.upiId || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone, upiId })
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.data);
        setIsEditing(false);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-2" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading profile...</div>;
  if (!user) return <div className="p-2" style={{ textAlign: 'center', color: 'var(--color-error)' }}>Failed to load profile.</div>;

  return (
    <div className="flex-col" style={{ paddingBottom: '80px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="text-h5" style={{ margin: 0 }}>Profile & Settings</h1>
        {!isEditing ? (
          <button className="md-btn md-btn-text" onClick={() => setIsEditing(true)}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
            Edit
          </button>
        ) : (
          <button className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }} onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      <div className="md-card" style={{ padding: '24px' }}>
        <div className="flex flex-col items-center" style={{ gap: '16px', marginBottom: '24px' }}>
          <img 
            src={user.avatar || 'https://via.placeholder.com/100'} 
            alt="Profile Avatar" 
            style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)', objectFit: 'cover' }} 
          />
          <div style={{ textAlign: 'center' }}>
            <div className="text-h6" style={{ lineHeight: 1.2 }}>{user.name}</div>
            <div className="text-body2">{user.email}</div>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col" style={{ gap: '16px' }}>
            <div>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Full Name</label>
              <input 
                type="text" 
                className="md-input" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>Phone Number</label>
              <input 
                type="tel" 
                className="md-input" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91"
              />
            </div>
            <div>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>UPI ID (For fast settlements)</label>
              <input 
                type="text" 
                className="md-input" 
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="e.g. rahul@okaxis"
              />
            </div>
            
            <button type="submit" className="md-btn md-btn-contained mt-2" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col" style={{ gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
              <div className="text-caption" style={{ marginBottom: '4px' }}>Phone Number</div>
              <div className="text-body1">{user.phone || <span style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>Not set</span>}</div>
            </div>
            
            <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
              <div className="text-caption" style={{ marginBottom: '4px' }}>UPI ID</div>
              <div className="text-body1 font-medium" style={{ color: user.upiId ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                {user.upiId || <span style={{ fontStyle: 'italic' }}>Not set</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-caption" style={{ 
        fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', 
        color: 'var(--color-text-tertiary)', marginTop: '28px', marginBottom: '12px' 
      }}>
        Preferences
      </div>
      
      <div className="md-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <label style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)',
          transition: 'background-color var(--transition-fast)'
        }}>
          <div className="flex items-center" style={{ gap: '12px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--color-text-secondary)', fontSize: '22px' }}>notifications</span>
            <span className="text-body1">Push Notifications</span>
          </div>
          <div style={{ position: 'relative', width: '44px', height: '24px' }}>
            <input type="checkbox" defaultChecked style={{ 
              width: '44px', height: '24px', appearance: 'none', borderRadius: '12px',
              backgroundColor: 'var(--color-border)', cursor: 'pointer', transition: 'background-color var(--transition-fast)',
              position: 'relative'
            }} 
            onChange={() => {}} 
            />
          </div>
        </label>
        
        <label style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)',
          transition: 'background-color var(--transition-fast)'
        }}>
          <div className="flex items-center" style={{ gap: '12px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--color-text-secondary)', fontSize: '22px' }}>dark_mode</span>
            <span className="text-body1">Dark Theme</span>
          </div>
          <div 
            onClick={toggleDarkMode}
            style={{ 
              position: 'relative', width: '44px', height: '24px', borderRadius: '12px',
              backgroundColor: isDarkMode ? 'var(--color-primary)' : 'var(--color-border)', 
              cursor: 'pointer', transition: 'background-color var(--transition-fast)',
              flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', 
              left: isDarkMode ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: '#fff', boxShadow: 'var(--shadow-xs)',
              transition: 'left var(--transition-fast)'
            }} />
          </div>
        </label>
        
        <div 
          onClick={handleLogout}
          style={{ 
            display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: '12px',
            transition: 'background-color var(--transition-fast)'
          }}
        >
          <span className="material-symbols-rounded" style={{ color: 'var(--color-error)', fontSize: '22px' }}>logout</span>
          <span className="text-body1 font-medium" style={{ color: 'var(--color-error)' }}>Logout</span>
        </div>
      </div>

    </div>
  );
}
