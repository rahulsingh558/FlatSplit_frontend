'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  
  // Don't show navigation on auth pages
  const isAuthPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');

  if (isAuthPage) {
    return <main className="main-content">{children}</main>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {/* Top App Bar could go here if we want a global one, but for now pages manage their own headers */}
        <div className="page-content">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
