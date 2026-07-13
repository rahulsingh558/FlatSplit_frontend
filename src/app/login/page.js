'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: `${apiUrl}/api/auth/google?platform=android` });
        // Loading state remains true until the app intercepts the deep link
      } else {
        window.location.href = `${apiUrl}/api/auth/google`;
      }
    } catch (e) {
      setLoading(false);
      alert('Failed to open login browser');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <div className="md-card flex flex-col items-center p-2 w-full" style={{ maxWidth: '380px', margin: '16px', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>receipt_long</span>
        </div>
        
        <h1 className="text-h5" style={{ marginBottom: '8px' }}>
          <span style={{ color: 'var(--color-primary)' }}>Flat</span>Split
        </h1>
        <p className="text-body2" style={{ marginBottom: '32px', maxWidth: '260px' }}>
          Manage your flat expenses and settle up effortlessly.
        </p>
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="md-btn md-btn-outlined w-full flex items-center justify-center gap-2"
          style={{ height: '46px', fontSize: '0.875rem', fontWeight: 500, borderRadius: 'var(--radius-sm)' }}
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" width="20" height="20" />
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
