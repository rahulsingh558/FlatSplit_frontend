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

  if (loading) return <div className="p-4 text-center">Loading profile...</div>;
  if (!user) return <div className="p-4 text-center text-error">Failed to load profile.</div>;

  return (
    <div className="flex-col gap-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-h5" style={{ margin: 0 }}>Profile & Settings</h1>
        {!isEditing ? (
          <button className="md-btn-text" style={{ color: 'var(--md-primary)' }} onClick={() => setIsEditing(true)}>
            <span className="material-icons mr-1" style={{ fontSize: '18px' }}>edit</span> Edit
          </button>
        ) : (
          <button className="md-btn-text" style={{ color: 'var(--md-text-secondary)' }} onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      <div className="md-card p-4">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img 
            src={user.avatar || 'https://via.placeholder.com/100'} 
            alt="Profile Avatar" 
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--md-primary)', objectFit: 'cover' }} 
          />
          <div className="text-center">
            <div className="text-h6" style={{ lineHeight: 1.2 }}>{user.name}</div>
            <div className="text-body2" style={{ color: 'var(--md-text-secondary)' }}>{user.email}</div>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-caption">Full Name</label>
              <input 
                type="text" 
                className="md-input mt-1" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-caption">Phone Number</label>
              <input 
                type="tel" 
                className="md-input mt-1" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91"
              />
            </div>
            <div>
              <label className="text-caption">UPI ID (For fast settlements)</label>
              <input 
                type="text" 
                className="md-input mt-1" 
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
          <div className="flex flex-col gap-4">
            <div style={{ borderBottom: '1px solid var(--md-divider)', paddingBottom: '12px' }}>
              <div className="text-caption mb-1">Phone Number</div>
              <div className="text-body1">{user.phone || <span style={{ fontStyle: 'italic', color: 'var(--md-text-disabled)' }}>Not set</span>}</div>
            </div>
            
            <div style={{ borderBottom: '1px solid var(--md-divider)', paddingBottom: '12px' }}>
              <div className="text-caption mb-1">UPI ID</div>
              <div className="text-body1 font-medium" style={{ color: user.upiId ? 'var(--md-secondary-variant)' : 'var(--md-text-disabled)' }}>
                {user.upiId || <span style={{ fontStyle: 'italic' }}>Not set</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-overline mt-6 mb-2" style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--md-text-secondary)' }}>
        Preferences
      </h2>
      
      <div className="md-card p-0 overflow-hidden mb-6">
        <label className="interactive flex items-center justify-between p-4 cursor-pointer" style={{ borderBottom: '1px solid var(--md-divider)' }}>
          <div className="flex items-center gap-3">
            <span className="material-icons" style={{ color: 'var(--md-text-secondary)' }}>notifications</span>
            <span className="text-body1">Push Notifications</span>
          </div>
          <div className="relative inline-block w-10 h-6">
            <input type="checkbox" className="peer sr-only" defaultChecked />
            <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[var(--md-primary)] transition-colors"></div>
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
          </div>
        </label>
        
        <label className="interactive flex items-center justify-between p-4 cursor-pointer" style={{ borderBottom: '1px solid var(--md-divider)' }}>
          <div className="flex items-center gap-3">
            <span className="material-icons" style={{ color: 'var(--md-text-secondary)' }}>dark_mode</span>
            <span className="text-body1">Dark Theme</span>
          </div>
          <div className="relative inline-block w-10 h-6">
            <input type="checkbox" className="peer sr-only" checked={isDarkMode} onChange={toggleDarkMode} />
            <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[var(--md-primary)] transition-colors"></div>
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
          </div>
        </label>
        
        <div className="interactive flex items-center p-4 cursor-pointer" onClick={handleLogout}>
          <div className="flex items-center gap-3 w-full">
            <span className="material-icons" style={{ color: 'var(--md-error)' }}>logout</span>
            <span className="text-body1 font-medium" style={{ color: 'var(--md-error)' }}>Logout</span>
          </div>
        </div>
      </div>

    </div>
  );
}
