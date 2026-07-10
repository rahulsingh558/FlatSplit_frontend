'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    // Redirect to backend Google OAuth route
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--md-background)' }}>
      <div className="md-card flex flex-col items-center text-center p-8 w-full" style={{ maxWidth: '400px', margin: '16px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          backgroundColor: 'rgba(98, 0, 238, 0.1)', color: 'var(--md-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <span className="material-icons" style={{ fontSize: '32px' }}>receipt_long</span>
        </div>
        
        <h1 className="text-h5 mb-2">FlatSplit</h1>
        <p className="text-body2 mb-8" style={{ color: 'var(--md-text-secondary)' }}>
          Manage your flat expenses and settle up effortlessly.
        </p>
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="md-btn md-btn-outlined w-full flex items-center justify-center gap-3"
          style={{ height: '48px', fontSize: '1rem' }}
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" width="24" height="24" />
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
