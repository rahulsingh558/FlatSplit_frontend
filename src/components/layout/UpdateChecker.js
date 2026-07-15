'use client';

import React, { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

// Register our custom AppUpdater plugin
const AppUpdater = registerPlugin('AppUpdater');

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Only check for updates if running on native Android
    if (Capacitor.getPlatform() === 'android') {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async () => {
    try {
      // 1. Get current app version from Capacitor App plugin
      const info = await App.getInfo();
      const currentVersion = info.version;

      // 2. Fetch latest version from our API
      const res = await fetch('/api/version');
      if (!res.ok) return;
      const data = await res.json();

      // 3. Compare versions (simple string comparison or parse floats)
      // Note: In production, consider using a semver library if versioning gets complex
      if (isNewerVersion(currentVersion, data.version)) {
        setUpdateInfo(data);
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.error('Failed to check for updates', err);
    }
  };

  const isNewerVersion = (current, latest) => {
    const v1 = current.split('.').map(Number);
    const v2 = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num2 > num1) return true;
      if (num2 < num1) return false;
    }
    return false;
  };

  const handleUpdate = async () => {
    if (!updateInfo || !updateInfo.apkUrl) return;
    setIsDownloading(true);
    
    try {
      // Call our custom native plugin to download and trigger installation
      await AppUpdater.downloadAndInstall({ url: updateInfo.apkUrl });
    } catch (err) {
      console.error('Update failed', err);
      alert('Failed to download update. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!updateAvailable || !updateInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // slightly above bottom navigation if present
      left: '16px',
      right: '16px',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div>
        <h3 className="text-subtitle1" style={{ margin: 0, fontWeight: 600, color: 'var(--color-primary)' }}>
          Update Available ({updateInfo.version})
        </h3>
        <p className="text-body2" style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
          {updateInfo.releaseNotes || 'A new version of FlatSplit is ready to install!'}
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {!updateInfo.forceUpdate && (
          <button 
            onClick={() => setUpdateAvailable(false)} 
            className="md-btn md-btn-text"
            disabled={isDownloading}
          >
            Later
          </button>
        )}
        <button 
          onClick={handleUpdate} 
          className="md-btn md-btn-contained"
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Update Now'}
        </button>
      </div>
    </div>
  );
}
