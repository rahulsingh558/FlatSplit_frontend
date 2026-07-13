'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export default function CapacitorAppListener() {
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appUrlOpen', async (data) => {
        if (data.url.startsWith('flatsplit://login')) {
          const url = new URL(data.url);
          const token = url.searchParams.get('token');
          
          if (token) {
            try {
              // Ask backend to set the HTTP-Only cookie via the mobile app's domain
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/set-cookie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                credentials: 'include'
              });

              if (res.ok) {
                // Close Custom Tab and redirect to dashboard
                await Browser.close();
                window.location.href = '/dashboard';
              } else {
                alert('Authentication failed');
                await Browser.close();
              }
            } catch (error) {
              console.error('Error exchanging token:', error);
              alert('Network error during login');
              await Browser.close();
            }
          }
        }
      });

      return () => {
        listener.then(l => l.remove());
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
